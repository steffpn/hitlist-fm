import Foundation

// MARK: - Monitored Song

/// A song being monitored for an artist user.
/// Response item from GET /artist/songs
struct MonitoredSong: Codable, Identifiable, Sendable {
    let id: Int
    let songTitle: String
    let artistName: String
    let isrc: String
    let activatedAt: Date
    let expiresAt: Date?
    let status: String  // "active", "expired", "pending"
    let totalPlays: Int?
    let stationCount: Int?
    let trend: SongTrend?
}

/// Trend data for a monitored song comparing week-over-week.
struct SongTrend: Codable, Sendable {
    let percentChange: Double
    let direction: String  // "up", "down", "flat"
    let thisWeek: Int?
    let lastWeek: Int?
}

// MARK: - Browse Tracks (catalog search)

/// Response item from GET /artist/browse-tracks?q= (Deezer-backed catalog search).
struct BrowseTrack: Codable, Identifiable, Sendable {
    let title: String
    let artist: String
    let isrc: String?
    let coverUrl: String?
    let deezerTrackId: Int

    var id: Int { deezerTrackId }
}

// MARK: - Artist Dashboard

/// Response from GET /artist/dashboard
struct ArtistDashboardResponse: Codable, Sendable {
    let totalPlaysToday: Int
    let totalPlaysWeek: Int
    let mostPlayedSong: MostPlayedSongInfo?
    /// Where this period's plays happened. Optional so a client can still talk to
    /// an API deployed before the field existed.
    let stationBreakdown: [StationBreakdownItem]?
    /// Echo of the requested period plus its total, for the selector-driven view.
    let period: String?
    let totalPlaysPeriod: Int?
}

/// Summary info for the most played song on the artist dashboard.
struct MostPlayedSongInfo: Codable, Sendable {
    let title: String
    let artist: String
    let plays: Int
}

// MARK: - Song Analytics

/// Partial song info returned by analytics endpoint.
struct AnalyticsSongInfo: Codable, Sendable {
    let id: Int
    let songTitle: String
    let artistName: String
    let isrc: String
    let activatedAt: Date
}

/// Response from GET /artist/songs/:id/analytics
struct SongAnalyticsResponse: Codable, Sendable {
    let song: AnalyticsSongInfo
    let dailyPlays: [DayPlayCount]
    let totalPlays: Int
    let stationCount: Int
}

/// A single day's play count used across artist and label analytics.
struct DayPlayCount: Codable, Identifiable, Sendable {
    let date: String
    let count: Int

    var id: String { date }

    /// Parse the date string into a Date.
    var parsedDate: Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: date)
    }
}

// MARK: - Station Breakdown

/// Response item from GET /artist/songs/:id/station-breakdown
struct StationBreakdownItem: Codable, Identifiable, Sendable {
    let stationId: Int
    let stationName: String
    let logoUrl: String?
    let playCount: Int

    var id: Int { stationId }
}

// MARK: - Hourly Heatmap

/// Response from GET /artist/songs/:id/hourly-heatmap
struct HourlyHeatmapResponse: Codable, Sendable {
    let matrix: [[Int]]  // 7 rows (days) x 24 cols (hours)
    let maxValue: Int
}

// MARK: - Peak Hours

/// Response item from GET /artist/songs/:id/peak-hours
struct PeakHourSlot: Codable, Identifiable, Sendable {
    let dayOfWeek: Int
    let hour: Int
    let plays: Int
    let label: String

    var id: String { "\(dayOfWeek)-\(hour)" }
}

// MARK: - Weekly Digest

/// Response from GET /artist/weekly-digest
struct WeeklyDigestResponse: Codable, Sendable {
    let songs: [SongDigestItem]
}

/// A song's weekly digest summary with week-over-week comparison.
struct SongDigestItem: Codable, Identifiable, Sendable {
    let songTitle: String
    let artistName: String
    let isrc: String
    let playsThisWeek: Int
    let playsLastWeek: Int
    let percentChange: Double
    let direction: String
    let newStations: [String]

    var id: String { isrc }
}


// MARK: - Songs Tab (role-scoped)

/// Row of GET /songs. The backend decides what "songs" means for the caller's
/// role — an artist's monitored tracks, a label's roster, a station's airplay —
/// so one shape serves every tab.
struct SongsRow: Codable, Identifiable, Sendable {
    let isrc: String?
    let songTitle: String
    let artistName: String
    let plays: Int
    let stationCount: Int
    let byStation: [SongsStationPlays]

    var id: String { isrc ?? "\(artistName)|\(songTitle)" }
}

struct SongsStationPlays: Codable, Identifiable, Sendable {
    let name: String
    let plays: Int

    var id: String { name }
}

struct SongsResponse: Codable, Sendable {
    let period: String
    let totalPlays: Int
    let uniqueSongs: Int
    let songs: [SongsRow]
    /// True when the list was capped — the UI says so rather than implying it is
    /// the whole picture.
    let truncated: Bool
}
