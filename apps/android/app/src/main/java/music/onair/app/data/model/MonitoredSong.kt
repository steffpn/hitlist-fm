package music.onair.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class SongTrend(
    val direction: String = "flat", // up | down | flat
    val percentChange: Double = 0.0,
)

// GET /artist/songs
@Serializable
data class MonitoredSong(
    val id: Int,
    val songTitle: String = "",
    val artistName: String = "",
    val isrc: String? = null,
    val status: String? = null,
    val totalPlays: Int = 0,
    val stationCount: Int = 0,
    val trend: SongTrend? = null,
)
