import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";

// ---- Prisma mock ----
const mockAirplayEventUpdate = vi.fn().mockResolvedValue({});

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    airplayEvent: {
      update: (...args: unknown[]) => mockAirplayEventUpdate(...args),
    },
  },
}));

// ---- Segment resolver mock ----
const mockResolveSegments = vi.fn();

vi.mock("../../src/lib/segment-resolver.js", () => ({
  resolveSegments: (...args: unknown[]) => mockResolveSegments(...args),
}));

// ---- R2 mock ----
const mockUploadToR2 = vi.fn().mockResolvedValue(undefined);

vi.mock("../../src/lib/r2.js", () => ({
  uploadToR2: (...args: unknown[]) => mockUploadToR2(...args),
}));

// ---- BullMQ mock ----
const mockWorkerOn = vi.fn();
const mockWorkerClose = vi.fn().mockResolvedValue(undefined);
const mockQueueClose = vi.fn().mockResolvedValue(undefined);
const mockQueueAdd = vi.fn().mockResolvedValue({});
const mockQueueUpsertJobScheduler = vi.fn().mockResolvedValue({});

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    close: (...args: unknown[]) => mockQueueClose(...args),
    add: (...args: unknown[]) => mockQueueAdd(...args),
    upsertJobScheduler: (...args: unknown[]) =>
      mockQueueUpsertJobScheduler(...args),
  })),
  Worker: vi.fn().mockImplementation(
    (
      _name: string,
      _processor: (job: unknown) => Promise<void>,
      _opts?: unknown,
    ) => ({
      on: (...args: unknown[]) => mockWorkerOn(...args),
      close: (...args: unknown[]) => mockWorkerClose(...args),
    }),
  ),
}));

// ---- Redis mock ----
vi.mock("../../src/lib/redis.js", () => ({
  createRedisConnection: vi.fn().mockReturnValue({}),
}));

// ---- Pino logger mock ----
const mockLoggerInfo = vi.fn();
const mockLoggerDebug = vi.fn();
const mockLoggerWarn = vi.fn();
const mockLoggerError = vi.fn();

vi.mock("pino", () => ({
  default: () => ({
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    debug: (...args: unknown[]) => mockLoggerDebug(...args),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
    child: vi.fn().mockReturnThis(),
  }),
}));

// ---- child_process mock ----
// The worker spawns two binaries per job: "ffmpeg" (extraction, watched via
// stderr + close) and "ffprobe" (duration check, result read from stdout).
interface MockProcess extends EventEmitter {
  stderr: EventEmitter | null;
  stdout: EventEmitter | null;
}

let mockFfmpegResult: {
  exitCode: number;
  error?: Error;
};

// Duration (seconds) reported by the mocked ffprobe. Production requires >= 8s.
let mockFfprobeDuration: string;

const mockSpawn = vi.fn().mockImplementation((command: string) => {
  const proc = new EventEmitter() as MockProcess;
  proc.stderr = new EventEmitter();
  proc.stdout = new EventEmitter();

  // Simulate the process completing (success or failure)
  process.nextTick(() => {
    if (command === "ffprobe") {
      proc.stdout?.emit("data", Buffer.from(`${mockFfprobeDuration}\n`));
      proc.emit("close", 0);
    } else if (mockFfmpegResult.error) {
      proc.emit("error", mockFfmpegResult.error);
    } else {
      proc.emit("close", mockFfmpegResult.exitCode);
    }
  });

  return proc;
});

vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

// ---- fs mock ----
const mockReadFile = vi.fn().mockResolvedValue(Buffer.from("fake-aac-data"));
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockUnlink = vi.fn().mockResolvedValue(undefined);

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: (...args: unknown[]) => mockReadFile(...args),
    writeFile: (...args: unknown[]) => mockWriteFile(...args),
    unlink: (...args: unknown[]) => mockUnlink(...args),
  },
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  unlink: (...args: unknown[]) => mockUnlink(...args),
}));

// ---- Test Data ----
const MOCK_JOB_DATA = {
  airplayEventId: 42,
  stationId: 1,
  detectedAt: "2026-03-15T14:30:05.000Z",
};

const MOCK_SEGMENTS = {
  segments: [
    "/mock/data/streams/1/segment-000.ts",
    "/mock/data/streams/1/segment-001.ts",
  ],
  seekOffsetSeconds: 2.5,
};

describe("Snippet Worker", () => {
  let processSnippetJob: typeof import("../../src/workers/snippet.js").processSnippetJob;
  let startSnippetWorker: typeof import("../../src/workers/snippet.js").startSnippetWorker;
  let SNIPPET_QUEUE: string;

  const originalEnv = process.env.SNIPPETS_ENABLED;

  beforeEach(async () => {
    // Reset all mocks
    mockResolveSegments.mockReset();
    mockUploadToR2.mockReset().mockResolvedValue(undefined);
    mockAirplayEventUpdate.mockReset().mockResolvedValue({});
    mockReadFile.mockReset().mockResolvedValue(Buffer.from("fake-aac-data"));
    mockWriteFile.mockReset().mockResolvedValue(undefined);
    mockUnlink.mockReset().mockResolvedValue(undefined);
    mockSpawn.mockClear();
    mockQueueAdd.mockClear();
    mockQueueUpsertJobScheduler.mockClear();
    mockLoggerInfo.mockClear();
    mockLoggerDebug.mockClear();
    mockLoggerWarn.mockClear();
    mockLoggerError.mockClear();
    mockWorkerOn.mockClear();

    // Default: snippets enabled, segments available, FFmpeg succeeds,
    // ffprobe reports a full 10s clip (>= 8s minimum)
    process.env.SNIPPETS_ENABLED = "true";
    mockResolveSegments.mockResolvedValue(MOCK_SEGMENTS);
    mockFfmpegResult = { exitCode: 0 };
    mockFfprobeDuration = "10.0";

    const mod = await import("../../src/workers/snippet.js");
    processSnippetJob = mod.processSnippetJob;
    startSnippetWorker = mod.startSnippetWorker;
    SNIPPET_QUEUE = mod.SNIPPET_QUEUE;
  });

  afterEach(() => {
    process.env.SNIPPETS_ENABLED = originalEnv;
  });

  // ============================================
  // Happy path
  // ============================================
  describe("Happy path", () => {
    it("extracts 10s clip via FFmpeg, uploads to R2, updates AirplayEvent.snippetUrl with R2 key", async () => {
      await processSnippetJob(MOCK_JOB_DATA);

      // FFmpeg (extraction) + ffprobe (duration verification) were spawned
      expect(mockSpawn).toHaveBeenCalledTimes(2);
      expect(mockSpawn).toHaveBeenNthCalledWith(
        1,
        "ffmpeg",
        expect.any(Array),
        expect.any(Object),
      );
      expect(mockSpawn).toHaveBeenNthCalledWith(
        2,
        "ffprobe",
        expect.any(Array),
        expect.any(Object),
      );

      // R2 upload was called
      expect(mockUploadToR2).toHaveBeenCalledWith(
        "snippets/1/2026-03-15/42.aac",
        Buffer.from("fake-aac-data"),
        "audio/aac",
      );

      // DB was updated
      expect(mockAirplayEventUpdate).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { snippetUrl: "snippets/1/2026-03-15/42.aac" },
      });
    });

    it("R2 key follows pattern: snippets/{stationId}/{YYYY-MM-DD}/{airplayEventId}.aac", async () => {
      await processSnippetJob({
        airplayEventId: 789,
        stationId: 42,
        detectedAt: "2026-06-20T08:15:30.000Z",
      });

      expect(mockUploadToR2).toHaveBeenCalledWith(
        "snippets/42/2026-06-20/789.aac",
        expect.any(Buffer),
        "audio/aac",
      );
    });
  });

  // ============================================
  // Kill switch
  // ============================================
  describe("Kill switch", () => {
    it("skips extraction when SNIPPETS_ENABLED is 'false'", async () => {
      process.env.SNIPPETS_ENABLED = "false";

      await processSnippetJob(MOCK_JOB_DATA);

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(mockUploadToR2).not.toHaveBeenCalled();
      expect(mockAirplayEventUpdate).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Missing segments
  // ============================================
  describe("Missing segments", () => {
    it("throws (for BullMQ retry) when resolveSegments returns null", async () => {
      mockResolveSegments.mockResolvedValue(null);

      // Snippets are mandatory: missing segments reject the job so BullMQ retries
      await expect(processSnippetJob(MOCK_JOB_DATA)).rejects.toThrow(
        "No segments available for snippet extraction",
      );

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(mockUploadToR2).not.toHaveBeenCalled();
      expect(mockAirplayEventUpdate).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Temp file cleanup
  // ============================================
  describe("Temp file cleanup", () => {
    // Two files are cleaned per job: the FFmpeg concat list (<temp>.aac.txt,
    // removed inside extractSnippet) and the temp .aac output (removed in the
    // finally block of processSnippetJob).
    it("cleans up concat list and temporary file after successful upload", async () => {
      await processSnippetJob(MOCK_JOB_DATA);

      expect(mockUnlink).toHaveBeenCalledTimes(2);
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringMatching(/snippet-42-\d+\.aac\.txt$/),
      );
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringMatching(/snippet-42-\d+\.aac$/),
      );
    });

    it("cleans up temporary files after failed FFmpeg extraction", async () => {
      mockFfmpegResult = { exitCode: 1 };

      await expect(processSnippetJob(MOCK_JOB_DATA)).rejects.toThrow(
        "FFmpeg exited with code 1",
      );

      // Concat list (close handler) + temp output (finally block)
      expect(mockUnlink).toHaveBeenCalledTimes(2);
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringMatching(/snippet-42-\d+\.aac$/),
      );
    });

    it("cleans up temporary files after failed R2 upload", async () => {
      mockUploadToR2.mockRejectedValue(new Error("R2 upload failed"));

      await expect(processSnippetJob(MOCK_JOB_DATA)).rejects.toThrow(
        "R2 upload failed",
      );

      // Concat list (close handler) + temp output (finally block)
      expect(mockUnlink).toHaveBeenCalledTimes(2);
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringMatching(/snippet-42-\d+\.aac$/),
      );
    });
  });

  // ============================================
  // FFmpeg arguments
  // ============================================
  describe("FFmpeg arguments", () => {
    it("spawns FFmpeg with concat demuxer, seek offset and 10s duration", async () => {
      await processSnippetJob(MOCK_JOB_DATA);

      expect(mockSpawn).toHaveBeenCalledWith(
        "ffmpeg",
        expect.arrayContaining([
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          expect.stringMatching(/snippet-42-\d+\.aac\.txt$/),
          "-ss",
          "2.5",
          "-t",
          "10",
          "-vn",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-ar",
          "44100",
          "-ac",
          "2",
          "-f",
          "adts",
        ]),
        expect.any(Object),
      );

      // The concat list file enumerates the resolved segments in order
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringMatching(/snippet-42-\d+\.aac\.txt$/),
        "file '/mock/data/streams/1/segment-000.ts'\n" +
          "file '/mock/data/streams/1/segment-001.ts'",
      );
    });
  });

  // ============================================
  // Worker lifecycle
  // ============================================
  describe("Worker lifecycle", () => {
    it("startSnippetWorker returns { queue, worker }", async () => {
      const result = await startSnippetWorker();

      expect(result).toHaveProperty("queue");
      expect(result).toHaveProperty("worker");
    });

    it("Worker concurrency is 2", async () => {
      const { Worker } = await import("bullmq");

      await startSnippetWorker();

      expect(Worker).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({ concurrency: 2 }),
      );
    });

    it("Worker uses SNIPPET_QUEUE constant for queue name", async () => {
      const { Worker, Queue } = await import("bullmq");

      await startSnippetWorker();

      expect(Queue).toHaveBeenCalledWith(
        SNIPPET_QUEUE,
        expect.any(Object),
      );
      expect(Worker).toHaveBeenCalledWith(
        SNIPPET_QUEUE,
        expect.any(Function),
        expect.any(Object),
      );
    });

    it("worker registers 'failed' event handler", async () => {
      await startSnippetWorker();

      expect(mockWorkerOn).toHaveBeenCalledWith(
        "failed",
        expect.any(Function),
      );
    });
  });
});
