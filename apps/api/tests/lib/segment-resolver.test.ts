import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock node:fs/promises ----
const mockReaddir = vi.fn();
const mockStat = vi.fn();

vi.mock("node:fs/promises", () => ({
  default: {
    readdir: (...args: unknown[]) => mockReaddir(...args),
    stat: (...args: unknown[]) => mockStat(...args),
  },
  readdir: (...args: unknown[]) => mockReaddir(...args),
  stat: (...args: unknown[]) => mockStat(...args),
}));

// ---- Mock supervisor ffmpeg to control DATA_DIR ----
vi.mock("../../src/services/supervisor/ffmpeg.js", () => ({
  DATA_DIR: "/mock/data/streams",
}));

/**
 * Current resolver behavior (src/lib/segment-resolver.ts):
 * - only non-empty (size > 0) *.ts files count as segments
 * - at least 2 usable segments are required, otherwise null
 * - each segment covers [mtime - 10s, mtime]
 * - detection window is detectedAt +/- 5s
 * - one extra segment BEFORE the first overlapping one is prepended if available
 * - seekOffsetSeconds = max(0, windowStart - start of first selected segment)
 */
describe("Segment Resolver", () => {
  let resolveSegments: typeof import("../../src/lib/segment-resolver.js").resolveSegments;

  beforeEach(async () => {
    mockReaddir.mockReset();
    mockStat.mockReset();

    const mod = await import("../../src/lib/segment-resolver.js");
    resolveSegments = mod.resolveSegments;
  });

  it("resolves a single segment when the detection window falls within one segment's time range", async () => {
    const detectedAt = new Date("2026-03-15T14:30:05.000Z");
    // Window: [14:30:00, 14:30:10]
    // Segment 1: mtime = 14:30:10 -> covers [14:30:00, 14:30:10] -> overlaps fully
    // Segment 2: mtime = 14:30:21 -> covers [14:30:11, 14:30:21] -> no overlap
    // (a second segment is needed because the resolver requires >= 2 files on disk)
    const seg1Mtime = new Date("2026-03-15T14:30:10.000Z").getTime();
    const seg2Mtime = new Date("2026-03-15T14:30:21.000Z").getTime();

    mockReaddir.mockResolvedValue(["segment-000.ts", "segment-001.ts"]);
    mockStat
      .mockResolvedValueOnce({ mtimeMs: seg1Mtime, size: 1024 })
      .mockResolvedValueOnce({ mtimeMs: seg2Mtime, size: 1024 });

    const result = await resolveSegments(1, detectedAt);

    expect(result).not.toBeNull();
    expect(result!.segments).toHaveLength(1);
    expect(result!.segments[0]).toBe("/mock/data/streams/1/segment-000.ts");
    expect(result!.seekOffsetSeconds).toBeGreaterThanOrEqual(0);
  });

  it("resolves two adjacent segments when detection timestamp falls near a segment boundary", async () => {
    const detectedAt = new Date("2026-03-15T14:30:10.000Z");
    // Segment 1: mtime = 14:30:10 -> covers [14:30:00, 14:30:10]
    // Segment 2: mtime = 14:30:20 -> covers [14:30:10, 14:30:20]
    // Window: [14:30:05, 14:30:15] -> overlaps both segments

    const seg1Mtime = new Date("2026-03-15T14:30:10.000Z").getTime();
    const seg2Mtime = new Date("2026-03-15T14:30:20.000Z").getTime();

    mockReaddir.mockResolvedValue(["segment-000.ts", "segment-001.ts"]);
    mockStat
      .mockResolvedValueOnce({ mtimeMs: seg1Mtime, size: 1024 })
      .mockResolvedValueOnce({ mtimeMs: seg2Mtime, size: 1024 });

    const result = await resolveSegments(1, detectedAt);

    expect(result).not.toBeNull();
    expect(result!.segments).toHaveLength(2);
    expect(result!.segments[0]).toBe("/mock/data/streams/1/segment-000.ts");
    expect(result!.segments[1]).toBe("/mock/data/streams/1/segment-001.ts");
  });

  it("returns null when no segment files exist in the station directory", async () => {
    const detectedAt = new Date("2026-03-15T14:30:05.000Z");

    mockReaddir.mockResolvedValue([]);

    const result = await resolveSegments(1, detectedAt);

    expect(result).toBeNull();
  });

  it("returns null when fewer than 2 non-empty segments exist", async () => {
    const detectedAt = new Date("2026-03-15T14:30:05.000Z");
    const segmentMtime = new Date("2026-03-15T14:30:05.000Z").getTime();

    // Two files, but one is empty (size 0) and is filtered out -> only 1 usable
    mockReaddir.mockResolvedValue(["segment-000.ts", "segment-001.ts"]);
    mockStat
      .mockResolvedValueOnce({ mtimeMs: segmentMtime, size: 1024 })
      .mockResolvedValueOnce({ mtimeMs: segmentMtime + 10_000, size: 0 });

    const result = await resolveSegments(1, detectedAt);

    expect(result).toBeNull();
  });

  it("returns null when all segments are too old (detection happened after buffer wrapped)", async () => {
    const detectedAt = new Date("2026-03-15T14:35:00.000Z");
    // Segments from ~5 minutes ago -- way before detection window
    const seg1Mtime = new Date("2026-03-15T14:29:50.000Z").getTime();
    const seg2Mtime = new Date("2026-03-15T14:30:00.000Z").getTime();

    mockReaddir.mockResolvedValue(["segment-000.ts", "segment-001.ts"]);
    mockStat
      .mockResolvedValueOnce({ mtimeMs: seg1Mtime, size: 1024 })
      .mockResolvedValueOnce({ mtimeMs: seg2Mtime, size: 1024 });

    const result = await resolveSegments(1, detectedAt);

    expect(result).toBeNull();
  });

  it("calculates correct seekOffsetSeconds from start of first segment to window start", async () => {
    const detectedAt = new Date("2026-03-15T14:30:07.500Z");
    // Window: [14:30:02.5, 14:30:12.5]
    // Segment 1: mtime = 14:30:10 -> covers [14:30:00, 14:30:10]
    // Segment 2: mtime = 14:30:20 -> covers [14:30:10, 14:30:20]
    // Both overlap; no earlier segment to prepend.
    // seekOffset = (14:30:02.5 - 14:30:00) / 1000 = 2.5
    const seg1Mtime = new Date("2026-03-15T14:30:10.000Z").getTime();
    const seg2Mtime = new Date("2026-03-15T14:30:20.000Z").getTime();

    mockReaddir.mockResolvedValue(["segment-000.ts", "segment-001.ts"]);
    mockStat
      .mockResolvedValueOnce({ mtimeMs: seg1Mtime, size: 1024 })
      .mockResolvedValueOnce({ mtimeMs: seg2Mtime, size: 1024 });

    const result = await resolveSegments(1, detectedAt);

    expect(result).not.toBeNull();
    expect(result!.seekOffsetSeconds).toBeCloseTo(2.5, 1);
  });

  it("prepends one extra segment before the first overlapping segment for safety", async () => {
    const detectedAt = new Date("2026-03-15T14:30:15.000Z");
    // Window: [14:30:10, 14:30:20]
    // Segment 1: mtime = 14:30:05 -> covers [14:29:55, 14:30:05] -> NO overlap
    // Segment 2: mtime = 14:30:15 -> covers [14:30:05, 14:30:15] -> overlaps
    // Segment 3: mtime = 14:30:25 -> covers [14:30:15, 14:30:25] -> overlaps
    // Segment 1 is prepended as the safety segment; seek is measured from its
    // start (14:29:55): (14:30:10 - 14:29:55) / 1000 = 15
    const seg1Mtime = new Date("2026-03-15T14:30:05.000Z").getTime();
    const seg2Mtime = new Date("2026-03-15T14:30:15.000Z").getTime();
    const seg3Mtime = new Date("2026-03-15T14:30:25.000Z").getTime();

    mockReaddir.mockResolvedValue([
      "segment-000.ts",
      "segment-001.ts",
      "segment-002.ts",
    ]);
    mockStat
      .mockResolvedValueOnce({ mtimeMs: seg1Mtime, size: 1024 })
      .mockResolvedValueOnce({ mtimeMs: seg2Mtime, size: 1024 })
      .mockResolvedValueOnce({ mtimeMs: seg3Mtime, size: 1024 });

    const result = await resolveSegments(1, detectedAt);

    expect(result).not.toBeNull();
    expect(result!.segments).toHaveLength(3);
    expect(result!.segments[0]).toBe("/mock/data/streams/1/segment-000.ts");
    expect(result!.seekOffsetSeconds).toBeCloseTo(15, 1);
  });

  it("handles non-.ts files in the directory gracefully (ignores them)", async () => {
    const detectedAt = new Date("2026-03-15T14:30:05.000Z");
    // Window: [14:30:00, 14:30:10]
    const seg1Mtime = new Date("2026-03-15T14:30:05.000Z").getTime();
    const seg2Mtime = new Date("2026-03-15T14:30:15.000Z").getTime();

    mockReaddir.mockResolvedValue([
      "segment-000.ts",
      ".gitkeep",
      "metadata.json",
      "segment-001.log",
      "segment-001.ts",
    ]);
    // Only the .ts files should be stat'd
    mockStat
      .mockResolvedValueOnce({ mtimeMs: seg1Mtime, size: 1024 })
      .mockResolvedValueOnce({ mtimeMs: seg2Mtime, size: 1024 });

    const result = await resolveSegments(1, detectedAt);

    expect(result).not.toBeNull();
    expect(result!.segments).toHaveLength(2);
    // stat should only be called twice (once per .ts file)
    expect(mockStat).toHaveBeenCalledTimes(2);
  });

  it("returns null when station directory does not exist", async () => {
    const detectedAt = new Date("2026-03-15T14:30:05.000Z");

    mockReaddir.mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );

    const result = await resolveSegments(1, detectedAt);

    expect(result).toBeNull();
  });
});
