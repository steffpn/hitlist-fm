import Foundation

/// Server-aggregated artist data from GET /artists/summary (admin Artists tab).
/// Replaces the old client-side aggregation over max 250 events, which produced
/// wrong totals.
struct ArtistSummary: Codable, Identifiable, Sendable {
    let artistName: String
    let playCount: Int
    let songCount: Int
    let stationCount: Int
    let lastPlayAt: Date

    var id: String { artistName }

    /// Convenience alias used across views.
    var name: String { artistName }
}
