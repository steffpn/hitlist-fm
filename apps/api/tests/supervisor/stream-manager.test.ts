import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";

// Mock child_process.spawn
const mockSpawn = vi.fn();
vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

// Mock fs/promises
const mockFsReaddir = vi.fn();
const mockFsStat = vi.fn();
vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: (...args: unknown[]) => mockFsReaddir(...args),
    stat: (...args: unknown[]) => mockFsStat(...args),
  },
}));

// Mock prisma
const mockPrismaStationUpdate = vi.fn().mockResolvedValue({});
const mockPrismaStationUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
const mockPrismaStationFindUnique = vi
  .fn()
  .mockResolvedValue({ name: "Test Station" });
const mockPrismaUserFindMany = vi.fn().mockResolvedValue([]);
vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    station: {
      update: (...args: unknown[]) => mockPrismaStationUpdate(...args),
      updateMany: (...args: unknown[]) => mockPrismaStationUpdateMany(...args),
      findUnique: (...args: unknown[]) => mockPrismaStationFindUnique(...args),
    },
    user: {
      findMany: (...args: unknown[]) => mockPrismaUserFindMany(...args),
    },
  },
}));

// Mock pino logger
vi.mock("pino", () => ({
  default: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  }),
}));

function createMockProcess(): EventEmitter & { kill: ReturnType<typeof vi.fn>; pid: number; stderr: EventEmitter } {
  const proc = new EventEmitter() as EventEmitter & {
    kill: ReturnType<typeof vi.fn>;
    pid: number;
    stderr: EventEmitter;
  };
  proc.kill = vi.fn().mockReturnValue(true);
  proc.pid = Math.floor(Math.random() * 10000) + 1000;
  proc.stderr = new EventEmitter();
  return proc;
}

describe("StreamManager", () => {
  let StreamManager: typeof import("../../src/services/supervisor/stream-manager.js").StreamManager;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrismaStationUpdate.mockResolvedValue({});
    mockPrismaStationUpdateMany.mockResolvedValue({ count: 1 });
    mockPrismaStationFindUnique.mockResolvedValue({ name: "Test Station" });
    mockPrismaUserFindMany.mockResolvedValue([]);
    mockFsReaddir.mockResolvedValue([]);
    mockFsStat.mockResolvedValue({ size: 0, mtime: new Date(0) });
    // Dynamic import to get fresh module after mocks
    const mod = await import("../../src/services/supervisor/stream-manager.js");
    StreamManager = mod.StreamManager;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("startStream", () => {
    it("should add entry to the internal Map and spawn FFmpeg", async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const manager = new StreamManager();
      await manager.startStream(1, "http://stream.example.com/live");

      const status = manager.getStatus(1);
      expect(status).toBeDefined();
      expect(status!.stationId).toBe(1);
      expect(status!.streamUrl).toBe("http://stream.example.com/live");
      expect(status!.status).toBe("recording");
      expect(status!.restartCount).toBe(0);
    });

    it("should NOT mark station ACTIVE in DB immediately on spawn", async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const manager = new StreamManager();
      await manager.startStream(1, "http://stream.example.com/live");

      // Spawning succeeds even for dead URLs -- no blind ACTIVE write allowed.
      expect(mockPrismaStationUpdate).not.toHaveBeenCalled();
      expect(mockPrismaStationUpdateMany).not.toHaveBeenCalled();
    });

    it("should confirm ERROR -> ACTIVE only after the first valid segment", async () => {
      vi.useFakeTimers();
      try {
        const mockProc = createMockProcess();
        mockSpawn.mockReturnValue(mockProc);

        // A fresh, valid segment written after the process spawned
        mockFsReaddir.mockResolvedValue(["segment-000.ts"]);
        mockFsStat.mockResolvedValue({
          size: 2048,
          mtime: new Date(Date.now() + 60_000),
        });

        const manager = new StreamManager();
        await manager.startStream(1, "http://stream.example.com/live");

        // First confirmation check fires after 15s
        await vi.advanceTimersByTimeAsync(15_000);

        expect(mockPrismaStationUpdateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 1, status: "ERROR" },
            data: expect.objectContaining({ status: "ACTIVE", restartCount: 0 }),
          }),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it("should not confirm ACTIVE when no fresh segment was written", async () => {
      vi.useFakeTimers();
      try {
        const mockProc = createMockProcess();
        mockSpawn.mockReturnValue(mockProc);

        // Only a stale segment from a previous run exists
        mockFsReaddir.mockResolvedValue(["segment-000.ts"]);
        mockFsStat.mockResolvedValue({
          size: 2048,
          mtime: new Date(Date.now() - 60_000),
        });

        const manager = new StreamManager();
        await manager.startStream(1, "http://stream.example.com/live");

        // Exhaust all confirmation attempts (4 x 15s)
        await vi.advanceTimersByTimeAsync(4 * 15_000 + 1_000);

        expect(mockPrismaStationUpdateMany).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("stopStream", () => {
    it("should kill the FFmpeg process and remove from Map", async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const manager = new StreamManager();
      await manager.startStream(1, "http://stream.example.com/live");

      await manager.stopStream(1);

      expect(mockProc.kill).toHaveBeenCalledWith("SIGTERM");
      expect(manager.getStatus(1)).toBeUndefined();
    });
  });

  describe("restartStream", () => {
    it("should stop then start the stream with same URL", async () => {
      const mockProc1 = createMockProcess();
      const mockProc2 = createMockProcess();
      mockSpawn.mockReturnValueOnce(mockProc1).mockReturnValueOnce(mockProc2);

      const manager = new StreamManager();
      await manager.startStream(1, "http://stream.example.com/live");
      await manager.restartStream(1);

      expect(mockProc1.kill).toHaveBeenCalledWith("SIGTERM");
      const status = manager.getStatus(1);
      expect(status).toBeDefined();
      expect(status!.status).toBe("recording");
      expect(status!.restartCount).toBe(0);
    });
  });

  describe("close event triggers handleStreamFailure", () => {
    it("should call handleStreamFailure when FFmpeg process exits", async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const manager = new StreamManager();
      await manager.startStream(1, "http://stream.example.com/live");

      // Simulate FFmpeg crash
      mockProc.emit("close", 1, null);

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      const status = manager.getStatus(1);
      expect(status).toBeDefined();
      expect(status!.restartCount).toBe(1);
      expect(status!.status).toBe("restarting");
    });
  });

  describe("stopAll", () => {
    it("should kill all processes", async () => {
      const mockProc1 = createMockProcess();
      const mockProc2 = createMockProcess();
      mockSpawn.mockReturnValueOnce(mockProc1).mockReturnValueOnce(mockProc2);

      const manager = new StreamManager();
      await manager.startStream(1, "http://stream1.example.com/live");
      await manager.startStream(2, "http://stream2.example.com/live");

      await manager.stopAll();

      expect(mockProc1.kill).toHaveBeenCalledWith("SIGTERM");
      expect(mockProc2.kill).toHaveBeenCalledWith("SIGTERM");
      expect(manager.getAllStatuses()).toHaveLength(0);
    });
  });

  describe("getAllStatuses", () => {
    it("should return array of all tracked stream states", async () => {
      const mockProc1 = createMockProcess();
      const mockProc2 = createMockProcess();
      mockSpawn.mockReturnValueOnce(mockProc1).mockReturnValueOnce(mockProc2);

      const manager = new StreamManager();
      await manager.startStream(1, "http://stream1.example.com/live");
      await manager.startStream(2, "http://stream2.example.com/live");

      const statuses = manager.getAllStatuses();
      expect(statuses).toHaveLength(2);
      expect(statuses.map((s) => s.stationId).sort()).toEqual([1, 2]);
    });
  });
});
