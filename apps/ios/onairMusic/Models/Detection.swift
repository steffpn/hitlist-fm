import Foundation

/// Mirrors `DetectionEvent` from packages/shared/src/types/detection.ts
struct Detection: Codable, Identifiable, Sendable {
    let id: Int
    let stationId: Int
    let detectedAt: Date
    let songTitle: String
    let artistName: String
    let albumTitle: String?
    let isrc: String?
    let confidence: Double
    let durationMs: Int
    let rawCallbackId: String?
    let createdAt: Date
}

/// Mirrors `AirplayEvent` from packages/shared/src/types/detection.ts
struct AirplayEvent: Codable, Identifiable, Sendable {
    let id: Int
    let stationId: Int
    let startedAt: Date
    let endedAt: Date
    let songTitle: String
    let artistName: String
    let isrc: String?
    let confidence: Double?
    let playCount: Int
    let snippetUrl: String?
    /// Played < 30s (teaser/jingle). Optional: SSE live events don't carry it.
    let partialPlay: Bool?
    /// Server-side cached Deezer album artwork. Optional: SSE live events don't carry it.
    let artworkUrl: String?
    /// Platform ids captured from ACRCloud at detection time, used for deep links.
    /// Optional: SSE live events don't carry them, and older rows may be null.
    let spotifyId: String?
    let youtubeId: String?
    /// Seconds the song actually aired on the station, measured by ACRCloud.
    /// Null for detections captured while the callback ran in RealTime mode.
    let playedDuration: Int?
    let createdAt: Date

    /// Nested station info included by the airplay-events API.
    let station: StationInfo?

    /// Lightweight station name included in airplay event responses.
    struct StationInfo: Codable, Sendable {
        let name: String
    }
}

/// One row of the detections feed: every play of the same song, on the same
/// station, on the same local day.
///
/// A group holding a single event renders exactly like an ungrouped detection, so
/// the feed only changes shape where a track was actually repeated.
struct DetectionGroup: Identifiable, Sendable {
    let id: String
    /// Newest first — the feed itself is ordered by startedAt descending.
    let events: [AirplayEvent]

    /// The play the collapsed row represents, and the one its detail view opens.
    var latest: AirplayEvent { events[0] }

    /// Airings in this group. playCount is summed rather than counted: the backend
    /// already merges the consecutive callbacks of one airing into a single event
    /// and records how many it merged.
    var totalPlays: Int {
        events.reduce(0) { $0 + max(1, $1.playCount) }
    }

    var isCollapsible: Bool { events.count > 1 }
}
