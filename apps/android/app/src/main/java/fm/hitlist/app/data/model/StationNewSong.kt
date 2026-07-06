package fm.hitlist.app.data.model

import kotlinx.serialization.Serializable

// GET /station/new-songs
@Serializable
data class NewSongItem(
    val songTitle: String = "",
    val artistName: String = "",
    val isrc: String? = null,
    val firstPlayedAt: String? = null,
)
