package music.onair.app.data.model

import kotlinx.serialization.Serializable

/** One row from GET /artists/summary?period=&limit= (admin global aggregation). */
@Serializable
data class ArtistsSummaryItem(
    val artistName: String = "",
    val playCount: Int = 0,
    val songCount: Int = 0,
    val stationCount: Int = 0,
    val lastPlayAt: String? = null,
)
