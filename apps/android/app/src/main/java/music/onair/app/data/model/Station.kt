package music.onair.app.data.model

import kotlinx.serialization.Serializable

// GET /station/overview
@Serializable
data class StationOverview(
    val totalPlays: Int = 0,
    val uniqueSongs: Int = 0,
    val uniqueArtists: Int = 0,
    val stationNames: List<String> = emptyList(),
)

// GET /station/top-songs
@Serializable
data class StationTopSong(
    val rank: Int = 0,
    val songTitle: String = "",
    val artistName: String = "",
    val isrc: String? = null,
    val playCount: Int = 0,
)
