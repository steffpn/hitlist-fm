package music.onair.app.data.model

import kotlinx.serialization.Serializable

/**
 * One artist row from GET /label/artists (getLabelArtists handler).
 * Backend returns a flat array of these objects (camelCase, no naming strategy).
 * All fields defaulted / nullable defensively.
 */
@Serializable
data class LabelArtistItem(
    val id: Int = 0,
    val artistName: String = "",
    val artistUserId: Int? = null,
    val pictureUrl: String? = null,
    val songCount: Int = 0,
    val totalPlays: Int = 0,
    val topSong: String? = null,
    val addedAt: String? = null,
)

/** One song row from GET /label/artists/:id/songs (getLabelArtistSongs handler). */
@Serializable
data class LabelArtistSong(
    val id: Int = 0,
    val songTitle: String = "",
    val artistName: String = "",
    val isrc: String? = null,
    val isMonitored: Boolean = false,
    val totalPlays: Int = 0,
    val stationCount: Int = 0,
    val activatedAt: String? = null,
)
