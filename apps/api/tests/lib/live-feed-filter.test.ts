import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock Prisma (ARTIST/LABEL ISRC lookups) ----
const mockMonitoredSongFindMany = vi.fn();
const mockLabelMonitoredSongFindMany = vi.fn();

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    monitoredSong: {
      findMany: (...args: unknown[]) => mockMonitoredSongFindMany(...args),
    },
    labelMonitoredSong: {
      findMany: (...args: unknown[]) =>
        mockLabelMonitoredSongFindMany(...args),
    },
  },
}));

import { shouldDeliverToUser } from "../../src/lib/live-feed-filter.js";
import type { LiveDetectionEvent } from "../../src/lib/pubsub.js";
import type { CurrentUser } from "../../src/middleware/authenticate.js";

// ---- Helper: build a LiveDetectionEvent ----
function buildEvent(overrides: Partial<LiveDetectionEvent> = {}): LiveDetectionEvent {
  return {
    id: 1,
    stationId: 5,
    songTitle: "Doua Inimi",
    artistName: "Irina Rimes",
    isrc: "ROA231600001",
    snippetUrl: null,
    stationName: "Radio ZU",
    startedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---- Helper: build a CurrentUser ----
// NOTE: the ISRC cache in live-feed-filter is module-level with a 60s TTL,
// so each test uses a unique user id to avoid cross-test cache hits.
let nextUserId = 1;
function buildUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: nextUserId++,
    email: "user@test.com",
    name: "Test User",
    role: "ADMIN",
    isActive: true,
    isPremium: false,
    scopes: [],
    ...overrides,
  };
}

beforeEach(() => {
  mockMonitoredSongFindMany.mockReset();
  mockLabelMonitoredSongFindMany.mockReset();
});

describe("shouldDeliverToUser", () => {
  // Test 1: ADMIN user receives any event regardless of stationId
  it("ADMIN user receives any event regardless of stationId", async () => {
    const event = buildEvent({ stationId: 99 });
    const user = buildUser({ role: "ADMIN", scopes: [] });

    await expect(shouldDeliverToUser(event, user)).resolves.toBe(true);
  });

  // Test 2: STATION user with scope [stationId: 5] receives event from station 5
  it("STATION user with matching station scope receives the event", async () => {
    const event = buildEvent({ stationId: 5 });
    const user = buildUser({
      role: "STATION",
      scopes: [{ entityType: "STATION", entityId: 5 }],
    });

    await expect(shouldDeliverToUser(event, user)).resolves.toBe(true);
  });

  // Test 3: STATION user with scope [stationId: 5] does NOT receive event from station 99
  it("STATION user without matching station scope does NOT receive the event", async () => {
    const event = buildEvent({ stationId: 99 });
    const user = buildUser({
      role: "STATION",
      scopes: [{ entityType: "STATION", entityId: 5 }],
    });

    await expect(shouldDeliverToUser(event, user)).resolves.toBe(false);
  });

  // Test 4: STATION user with multiple station scopes receives events from any of them
  it("STATION user with multiple station scopes receives events from any scoped station", async () => {
    const event = buildEvent({ stationId: 10 });
    const user = buildUser({
      role: "STATION",
      scopes: [
        { entityType: "STATION", entityId: 5 },
        { entityType: "STATION", entityId: 10 },
        { entityType: "STATION", entityId: 15 },
      ],
    });

    await expect(shouldDeliverToUser(event, user)).resolves.toBe(true);
  });

  // Test 5: STATION user with zero scopes does NOT receive events
  it("STATION user with zero scopes does NOT receive events", async () => {
    const event = buildEvent();
    const user = buildUser({ role: "STATION", scopes: [] });

    await expect(shouldDeliverToUser(event, user)).resolves.toBe(false);
  });

  // Test 6: ARTIST user receives event whose ISRC is in their monitored songs
  it("ARTIST user receives event matching a monitored ISRC", async () => {
    mockMonitoredSongFindMany.mockResolvedValue([{ isrc: "ROA231600001" }]);
    const event = buildEvent({ isrc: "ROA231600001" });
    const user = buildUser({ role: "ARTIST" });

    await expect(shouldDeliverToUser(event, user)).resolves.toBe(true);
    expect(mockMonitoredSongFindMany).toHaveBeenCalledWith({
      where: { userId: user.id, status: "active" },
      select: { isrc: true },
    });
  });

  // Test 7: ARTIST user does NOT receive event with non-monitored ISRC
  it("ARTIST user does NOT receive event with non-monitored ISRC", async () => {
    mockMonitoredSongFindMany.mockResolvedValue([{ isrc: "ROA231600001" }]);
    const event = buildEvent({ isrc: "USUM72000000" });
    const user = buildUser({ role: "ARTIST" });

    await expect(shouldDeliverToUser(event, user)).resolves.toBe(false);
  });

  // Test 8: ARTIST user with no monitored songs receives nothing
  it("ARTIST user with no monitored songs does NOT receive events", async () => {
    mockMonitoredSongFindMany.mockResolvedValue([]);
    const event = buildEvent();
    const user = buildUser({ role: "ARTIST" });

    await expect(shouldDeliverToUser(event, user)).resolves.toBe(false);
  });

  // Test 9: ARTIST user does NOT receive events without an ISRC
  it("ARTIST user does NOT receive events with a null ISRC", async () => {
    const event = buildEvent({ isrc: null });
    const user = buildUser({ role: "ARTIST" });

    await expect(shouldDeliverToUser(event, user)).resolves.toBe(false);
    expect(mockMonitoredSongFindMany).not.toHaveBeenCalled();
  });

  // Test 10: LABEL user receives event whose ISRC is in their label-monitored songs
  it("LABEL user receives event matching a label-monitored ISRC", async () => {
    mockLabelMonitoredSongFindMany.mockResolvedValue([
      { monitoredSong: { isrc: "ROA231600001" } },
    ]);
    const event = buildEvent({ isrc: "ROA231600001" });
    const user = buildUser({ role: "LABEL" });

    await expect(shouldDeliverToUser(event, user)).resolves.toBe(true);
    expect(mockLabelMonitoredSongFindMany).toHaveBeenCalledWith({
      where: { labelArtist: { labelUserId: user.id } },
      include: { monitoredSong: { select: { isrc: true } } },
    });
  });

  // Test 11: LABEL user does NOT receive event with non-monitored ISRC
  it("LABEL user does NOT receive event with non-monitored ISRC", async () => {
    mockLabelMonitoredSongFindMany.mockResolvedValue([
      { monitoredSong: { isrc: "ROA231600001" } },
    ]);
    const event = buildEvent({ isrc: "USUM72000000" });
    const user = buildUser({ role: "LABEL" });

    await expect(shouldDeliverToUser(event, user)).resolves.toBe(false);
  });

  // Test 12: LABEL user with no monitored songs receives nothing
  it("LABEL user with no monitored songs does NOT receive events", async () => {
    mockLabelMonitoredSongFindMany.mockResolvedValue([]);
    const event = buildEvent();
    const user = buildUser({ role: "LABEL" });

    await expect(shouldDeliverToUser(event, user)).resolves.toBe(false);
  });

  // Test 13: ISRC set is cached — repeated events do not re-query the DB
  it("caches the ISRC set so repeated events do not hit the DB", async () => {
    mockMonitoredSongFindMany.mockResolvedValue([{ isrc: "ROA231600001" }]);
    const user = buildUser({ role: "ARTIST" });

    await expect(
      shouldDeliverToUser(buildEvent({ id: 1 }), user),
    ).resolves.toBe(true);
    await expect(
      shouldDeliverToUser(buildEvent({ id: 2 }), user),
    ).resolves.toBe(true);
    await expect(
      shouldDeliverToUser(buildEvent({ id: 3, isrc: "USUM72000000" }), user),
    ).resolves.toBe(false);

    expect(mockMonitoredSongFindMany).toHaveBeenCalledTimes(1);
  });

  // Test 14: DB lookup failures fail closed (no events delivered)
  it("fails closed when the ISRC lookup errors", async () => {
    mockMonitoredSongFindMany.mockRejectedValue(new Error("db down"));
    const event = buildEvent();
    const user = buildUser({ role: "ARTIST" });

    await expect(shouldDeliverToUser(event, user)).resolves.toBe(false);
  });
});
