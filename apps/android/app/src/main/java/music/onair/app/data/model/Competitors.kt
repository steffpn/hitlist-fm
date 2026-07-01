package music.onair.app.data.model

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
