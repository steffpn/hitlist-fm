package fm.hitlist.app.data.model

import kotlinx.serialization.Serializable

// GET /dashboard/summary
@Serializable
data class PlayCountBucket(
    val bucket: String, // ISO date
    val playCount: Int = 0,
    val uniqueSongs: Int = 0,
    val uniqueArtists: Int = 0,
)

@Serializable
data class PlayCountTotals(
    val playCount: Int = 0,
    val uniqueSongs: Int = 0,
    val uniqueArtists: Int = 0,
)

@Serializable
data class DashboardSummaryResponse(
    val buckets: List<PlayCountBucket> = emptyList(),
    val totals: PlayCountTotals = PlayCountTotals(),
)

// GET /dashboard/top-stations
@Serializable
data class StationPlayCount(
    val stationId: Int,
    val stationName: String = "",
    val playCount: Int = 0,
)

@Serializable
data class TopStationsResponse(
    val stations: List<StationPlayCount> = emptyList(),
)
