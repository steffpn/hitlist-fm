package music.onair.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** GET /airplay-events/:id/snippet — presigned playback URL. */
@Serializable
data class SnippetUrlResponse(
    val url: String,
    val expiresIn: Int? = null,
)

// ---- Deezer public API (api.deezer.com/search) — snake_case JSON ----

@Serializable
data class DeezerSearchResponse(
    val data: List<DeezerTrack> = emptyList(),
)

@Serializable
data class DeezerTrack(
    val id: Long = 0,
    val title: String = "",
    val duration: Int = 0,
    val album: DeezerAlbum? = null,
)

@Serializable
data class DeezerAlbum(
    val title: String? = null,
    @SerialName("cover_medium") val coverMedium: String? = null,
    @SerialName("cover_big") val coverBig: String? = null,
)
