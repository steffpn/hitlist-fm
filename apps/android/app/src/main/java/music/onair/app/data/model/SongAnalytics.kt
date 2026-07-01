package music.onair.app.data.model

import kotlinx.serialization.Serializable

// --- GET /artist/songs/:id/analytics ---

@Serializable
data class SongAnalyticsSongInfo(
    val id: Int = 0,
    val songTitle: String = "",
    val artistName: String = "",
    val isrc: String? = null,
    val activatedAt: String? = null,
)

@Serializable
data class SongAnalyticsDailyPlay(
    val date: String = "",
    val count: Int = 0,
)

@Serializable
data class SongAnalyticsResponse(
    val song: SongAnalyticsSongInfo? = null,
    val dailyPlays: List<SongAnalyticsDailyPlay> = emptyList(),
    val totalPlays: Int = 0,
    val stationCount: Int = 0,
)

// --- GET /artist/songs/:id/station-breakdown ---

@Serializable
data class SongStationBreakdownItem(
    val stationId: Int = 0,
    val stationName: String = "",
    val logoUrl: String? = null,
    val playCount: Int = 0,
)

// --- GET /artist/songs/:id/hourly-heatmap ---

@Serializable
data class SongHourlyHeatmapResponse(
    val matrix: List<List<Int>> = emptyList(),
    val maxValue: Int = 0,
)
