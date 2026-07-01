package music.onair.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class MostPlayedSong(
    val title: String = "",
    val artist: String = "",
    val plays: Int = 0,
)

// GET /artist/dashboard
@Serializable
data class ArtistDashboardResponse(
    val totalPlaysToday: Int = 0,
    val totalPlaysWeek: Int = 0,
    val mostPlayedSong: MostPlayedSong? = null,
)
