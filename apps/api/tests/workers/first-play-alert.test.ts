import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Prisma mock ----
const mockStationFindFirst = vi.fn();
const mockStationUpdate = vi.fn();
const mockDetectionCreate = vi.fn();
const mockAirplayEventFindFirst = vi.fn();
const mockAirplayEventFindMany = vi.fn();
const mockAirplayEventCreate = vi.fn();
const mockAirplayEventUpdate = vi.fn();
const mockMonitoredSongFindMany = vi.fn();

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    station: {
      findFirst: (...args: unknown[]) => mockStationFindFirst(...args),
      update: (...args: unknown[]) => mockStationUpdate(...args),
    },
    detection: {
      create: (...args: unknown[]) => mockDetectionCreate(...args),
    },
    airplayEvent: {
      findFirst: (...args: unknown[]) => mockAirplayEventFindFirst(...args),
      findMany: (...args: unknown[]) => mockAirplayEventFindMany(...args),
      create: (...args: unknown[]) => mockAirplayEventCreate(...args),
      update: (...args: unknown[]) => mockAirplayEventUpdate(...args),
    },
    monitoredSong: {
      findMany: (...args: unknown[]) => mockMonitoredSongFindMany(...args),
    },
  },
}));

// ---- BullMQ mock ----
vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// ---- Deezer mock ----
vi.mock("../../src/lib/deezer.js", () => ({
  lookupArtwork: vi.fn().mockResolvedValue(null),
}));

// ---- Push mock ----
const mockSendPush = vi.fn().mockResolvedValue(undefined);
vi.mock("../../src/lib/push.js", () => ({
  sendPush: (...args: unknown[]) => mockSendPush(...args),
}));

// ---- Redis mock ----
const mockRedisIncr = vi.fn();
const mockRedisExpire = vi.fn().mockResolvedValue(1);
const mockRedisPublish = vi.fn().mockResolvedValue(0);
const mockRedisZadd = vi.fn().mockResolvedValue(1);
const mockRedisZremrangebyrank = vi.fn().mockResolvedValue(0);
const mockRedisSet = vi.fn().mockResolvedValue("OK");
const mockRedisDel = vi.fn().mockResolvedValue(1);

vi.mock("../../src/lib/redis.js", () => ({
  createRedisConnection: vi.fn().mockReturnValue({}),
  redis: {
    incr: (...args: unknown[]) => mockRedisIncr(...args),
    expire: (...args: unknown[]) => mockRedisExpire(...args),
    publish: (...args: unknown[]) => mockRedisPublish(...args),
    zadd: (...args: unknown[]) => mockRedisZadd(...args),
    zremrangebyrank: (...args: unknown[]) => mockRedisZremrangebyrank(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
    del: (...args: unknown[]) => mockRedisDel(...args),
  },
}));

// ---- Pino logger mock ----
vi.mock("pino", () => ({
  default: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  }),
}));

// ---- Fixtures ----

const ISRC = "ROA231600001";

function makeUser(
  id: number,
  overrides: Partial<{
    deviceTokens: Array<{ token: string; platform: string }>;
    settings: { firstPlayAlertsEnabled: boolean } | null;
  }> = {},
) {
  return {
    id,
    deviceTokens: overrides.deviceTokens ?? [
      { token: `token-${id}`, platform: "ios" },
    ],
    settings: overrides.settings === undefined ? null : overrides.settings,
  };
}

function makeMonitoredSong(user: ReturnType<typeof makeUser>, labelUsers: Array<ReturnType<typeof makeUser>> = []) {
  return {
    id: 1,
    isrc: ISRC,
    status: "active",
    user,
    labelMonitoredSongs: labelUsers.map((labelUser, i) => ({
      id: i + 1,
      labelArtist: { labelUser },
    })),
  };
}

const PARAMS = {
  airplayEventId: 42,
  isrc: ISRC,
  songTitle: "Doua Inimi",
  stationId: 1,
  stationName: "Radio ZU",
};

describe("First-play 'ON AIR' push", () => {
  let notifyFirstPlay: typeof import("../../src/workers/detection.js").notifyFirstPlay;
  let processCallback: typeof import("../../src/workers/detection.js").processCallback;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRedisIncr.mockResolvedValue(1);
    mockRedisExpire.mockResolvedValue(1);
    mockSendPush.mockResolvedValue(undefined);

    const mod = await import("../../src/workers/detection.js");
    notifyFirstPlay = mod.notifyFirstPlay;
    processCallback = mod.processCallback;
  });

  it("sends the push with the exact contract on the first play of an ISRC on a station", async () => {
    mockAirplayEventFindFirst.mockResolvedValue(null); // no prior event on station
    mockMonitoredSongFindMany.mockResolvedValue([makeMonitoredSong(makeUser(7))]);

    await notifyFirstPlay(PARAMS);

    expect(mockSendPush).toHaveBeenCalledTimes(1);
    expect(mockSendPush).toHaveBeenCalledWith(
      { token: "token-7", platform: "ios" },
      {
        title: "🔴 ON AIR: Doua Inimi",
        body: "Doua Inimi rulează acum pe Radio ZU",
        data: {
          type: "first_play",
          airplayEventId: "42",
          isrc: ISRC,
        },
      },
    );
  });

  it("rule (a): does NOT push when the ISRC already played on that station", async () => {
    mockAirplayEventFindFirst.mockResolvedValue({ id: 5 }); // prior event exists

    await notifyFirstPlay(PARAMS);

    expect(mockAirplayEventFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isrc: ISRC, stationId: 1, id: { not: 42 } },
      }),
    );
    expect(mockMonitoredSongFindMany).not.toHaveBeenCalled();
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it("rule (b): suppresses the push once the user's 24h counter exceeds the limit", async () => {
    mockAirplayEventFindFirst.mockResolvedValue(null);
    mockMonitoredSongFindMany.mockResolvedValue([makeMonitoredSong(makeUser(7))]);
    mockRedisIncr.mockResolvedValue(6); // 6th push today -> over the limit of 5

    await notifyFirstPlay(PARAMS);

    expect(mockRedisIncr).toHaveBeenCalledWith("first-play-cap:7");
    // TTL only set when the counter is created (count === 1)
    expect(mockRedisExpire).not.toHaveBeenCalled();
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it("rule (b): still pushes at exactly the limit and sets the 24h TTL on first increment", async () => {
    mockAirplayEventFindFirst.mockResolvedValue(null);
    mockMonitoredSongFindMany.mockResolvedValue([makeMonitoredSong(makeUser(7))]);
    mockRedisIncr.mockResolvedValueOnce(1);

    await notifyFirstPlay(PARAMS);

    expect(mockRedisExpire).toHaveBeenCalledWith("first-play-cap:7", 24 * 60 * 60);
    expect(mockSendPush).toHaveBeenCalledTimes(1);

    // 5th push (== limit) still goes out
    mockSendPush.mockClear();
    mockRedisIncr.mockResolvedValueOnce(5);
    await notifyFirstPlay(PARAMS);
    expect(mockSendPush).toHaveBeenCalledTimes(1);
  });

  it("rule (c): respects firstPlayAlertsEnabled=false without touching the counter", async () => {
    mockAirplayEventFindFirst.mockResolvedValue(null);
    mockMonitoredSongFindMany.mockResolvedValue([
      makeMonitoredSong(makeUser(7, { settings: { firstPlayAlertsEnabled: false } })),
    ]);

    await notifyFirstPlay(PARAMS);

    expect(mockRedisIncr).not.toHaveBeenCalled();
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it("rule (c): a missing settings row means enabled (default true)", async () => {
    mockAirplayEventFindFirst.mockResolvedValue(null);
    mockMonitoredSongFindMany.mockResolvedValue([
      makeMonitoredSong(makeUser(7, { settings: null })),
    ]);

    await notifyFirstPlay(PARAMS);

    expect(mockSendPush).toHaveBeenCalledTimes(1);
  });

  it("notifies linked label users and de-duplicates recipients", async () => {
    mockAirplayEventFindFirst.mockResolvedValue(null);
    const artist = makeUser(7);
    const label = makeUser(9);
    // The same label linked twice must still receive a single push
    mockMonitoredSongFindMany.mockResolvedValue([
      makeMonitoredSong(artist, [label, label]),
    ]);

    await notifyFirstPlay(PARAMS);

    expect(mockSendPush).toHaveBeenCalledTimes(2);
    const tokens = mockSendPush.mock.calls.map((c) => (c[0] as { token: string }).token);
    expect(tokens).toEqual(expect.arrayContaining(["token-7", "token-9"]));
  });

  it("does nothing when nobody monitors the ISRC", async () => {
    mockAirplayEventFindFirst.mockResolvedValue(null);
    mockMonitoredSongFindMany.mockResolvedValue([]);

    await notifyFirstPlay(PARAMS);

    expect(mockRedisIncr).not.toHaveBeenCalled();
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it("skips users with no registered devices without consuming their daily cap", async () => {
    mockAirplayEventFindFirst.mockResolvedValue(null);
    mockMonitoredSongFindMany.mockResolvedValue([
      makeMonitoredSong(makeUser(7, { deviceTokens: [] })),
    ]);

    await notifyFirstPlay(PARAMS);

    expect(mockRedisIncr).not.toHaveBeenCalled();
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  // ---- Integration with processCallback (fire-and-forget trigger) ----

  function buildCallback(playedDuration?: number) {
    return {
      stream_id: "s-abc123",
      status: 1,
      data: {
        status: { msg: "Success", code: 0, version: "1.0" },
        metadata: {
          timestamp_utc: "2026-03-15 14:30:00",
          ...(playedDuration !== undefined ? { played_duration: playedDuration } : {}),
          music: [
            {
              title: "Doua Inimi",
              artists: [{ name: "Irina Rimes" }],
              duration_ms: 186506,
              score: 85,
              acrid: "abc123",
              external_ids: { isrc: ISRC },
            },
          ],
        },
      },
    };
  }

  it("processCallback triggers the push for a NEW full-play event", async () => {
    mockStationFindFirst.mockResolvedValue({ id: 1, name: "Radio ZU", acrcloudStreamId: "s-abc123" });
    mockDetectionCreate.mockResolvedValue({});
    mockAirplayEventFindFirst.mockResolvedValue(null);
    mockAirplayEventFindMany.mockResolvedValue([]);
    mockAirplayEventCreate.mockResolvedValue({
      id: 42,
      stationId: 1,
      songTitle: "Doua Inimi",
      isrc: ISRC,
      partialPlay: false,
      snippetUrl: null,
    });
    mockAirplayEventUpdate.mockResolvedValue({});
    mockStationUpdate.mockResolvedValue({});
    mockMonitoredSongFindMany.mockResolvedValue([makeMonitoredSong(makeUser(7))]);

    await processCallback(buildCallback() as never);

    await vi.waitFor(() => expect(mockSendPush).toHaveBeenCalledTimes(1));
    expect(mockSendPush.mock.calls[0][1]).toMatchObject({
      title: "🔴 ON AIR: Doua Inimi",
      data: { type: "first_play", airplayEventId: "42", isrc: ISRC },
    });
  });

  it("processCallback does NOT trigger the push for a partial play (< 30s)", async () => {
    mockStationFindFirst.mockResolvedValue({ id: 1, name: "Radio ZU", acrcloudStreamId: "s-abc123" });
    mockDetectionCreate.mockResolvedValue({});
    mockAirplayEventFindFirst.mockResolvedValue(null);
    mockAirplayEventFindMany.mockResolvedValue([]);
    mockAirplayEventCreate.mockResolvedValue({
      id: 43,
      stationId: 1,
      songTitle: "Doua Inimi",
      isrc: ISRC,
      partialPlay: true,
      snippetUrl: null,
    });
    mockStationUpdate.mockResolvedValue({});
    mockMonitoredSongFindMany.mockResolvedValue([makeMonitoredSong(makeUser(7))]);

    await processCallback(buildCallback(10) as never);

    // Give any stray fire-and-forget chain a chance to run
    await new Promise((r) => setImmediate(r));
    expect(mockMonitoredSongFindMany).not.toHaveBeenCalled();
    expect(mockSendPush).not.toHaveBeenCalled();
  });
});
