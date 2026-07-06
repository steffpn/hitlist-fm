package fm.hitlist.app.data.model

import kotlinx.serialization.Serializable

// GET /competitors/summary?period
@Serializable
data class CompetitorTopSong(
    val title: String = "",
    val artist: String = "",
)

@Serializable
data class CompetitorSummaryItem(
    val stationId: Int = 0,
    val stationName: String = "",
    val playCount: Int = 0,
    val topSong: CompetitorTopSong? = null,
)

// GET /competitors/{stationId}/detail?period
@Serializable
data class CompetitorDetailTopSong(
    val title: String = "",
    val artist: String = "",
    val isrc: String? = null,
    val playCount: Int = 0,
)

@Serializable
data class CompetitorRecentDetection(
    val id: Int = 0,
    val songTitle: String = "",
    val artistName: String = "",
    val startedAt: String? = null,
)

@Serializable
data class CompetitorComparisonItem(
    val songTitle: String = "",
    val artistName: String = "",
    val theirPlays: Int = 0,
    val yourPlays: Int = 0,
)

@Serializable
data class CompetitorDetailResponse(
    val topSongs: List<CompetitorDetailTopSong> = emptyList(),
    val recentDetections: List<CompetitorRecentDetection> = emptyList(),
    val comparison: List<CompetitorComparisonItem> = emptyList(),
)

// GET /competitors/watched (+ POST /competitors/watched response)
@Serializable
data class WatchedStation(
    val id: Int = 0,
    val stationId: Int = 0,
    val stationName: String = "",
)

// GET /competitors/own — own station ids to exclude in the picker.
@Serializable
data class OwnStationsResponse(
    val stationIds: List<Int> = emptyList(),
)

// POST /competitors/watched — NOTE: key must be `stationId`
// (bug fixed on iOS in commit 2cfdde6; server schema is AddWatchedStationBodySchema).
@Serializable
data class AddWatchedStationRequest(
    val stationId: Int,
)

// GET /station/overlap/{competitorId}?period=
@Serializable
data class OverlapSharedSong(
    val songTitle: String = "",
    val artistName: String = "",
    val yourPlays: Int = 0,
    val theirPlays: Int = 0,
)

@Serializable
data class PlaylistOverlapResponse(
    val overlapPercent: Double = 0.0,
    val sharedCount: Int = 0,
    val exclusiveToYou: Int = 0,
    val exclusiveToThem: Int = 0,
    val sharedSongs: List<OverlapSharedSong> = emptyList(),
)
