package music.onair.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class LabelArtistSummary(
    val artistName: String = "",
    val pictureUrl: String? = null,
    val songCount: Int = 0,
    val totalPlays: Int = 0,
    val topSong: String? = null,
)

@Serializable
data class CatalogSong(
    val id: Int = 0,
    val songTitle: String = "",
    val artistName: String = "",
    val isrc: String? = null,
    val totalPlays: Int = 0,
    val stationCount: Int = 0,
)

// GET /label/dashboard
@Serializable
data class LabelDashboardResponse(
    val totalPlays: Int = 0,
    val artistSummaries: List<LabelArtistSummary> = emptyList(),
    val catalogSongs: List<CatalogSong> = emptyList(),
)
