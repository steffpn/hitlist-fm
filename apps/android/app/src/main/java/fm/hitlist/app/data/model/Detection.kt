package fm.hitlist.app.data.model

import kotlinx.serialization.Serializable

/** Mirrors AirplayEvent from apps/ios/onairMusic/Models/Detection.swift.
 *  Dates are kept as ISO strings and formatted at the UI layer. */
@Serializable
data class AirplayEvent(
    val id: Int,
    val stationId: Int? = null,
    val startedAt: String? = null,
    val endedAt: String? = null,
    val songTitle: String = "",
    val artistName: String = "",
    val isrc: String? = null,
    val confidence: Double? = null,
    val playCount: Int = 0,
    val snippetUrl: String? = null,
    // Played < 30s (teaser/jingle) — rendered with a small warning marker.
    val partialPlay: Boolean = false,
    // Cached Deezer album artwork resolved server-side.
    val artworkUrl: String? = null,
    // Platform ids captured from ACRCloud at detection time, used for deep links.
    // Null on SSE live events and on rows detected before they were stored.
    val spotifyId: String? = null,
    val youtubeId: String? = null,
    // Seconds the song actually aired, measured by ACRCloud. Null for detections
    // captured while the callback ran in RealTime mode (fires on recognition,
    // before the play has finished, so it carries no duration).
    val playedDuration: Int? = null,
    val createdAt: String? = null,
    val station: StationInfo? = null,
) {
    @Serializable
    data class StationInfo(val name: String? = null)
}

/** Cursor-paginated wrapper: { data: [...], nextCursor: Int? }. */
@Serializable
data class PaginatedResponse<T>(
    val data: List<T> = emptyList(),
    val nextCursor: Int? = null,
)

/** Minimal Station (filters + names); extra fields ignored via ignoreUnknownKeys. */
@Serializable
data class Station(
    val id: Int,
    val name: String,
    val country: String? = null,
    val logoUrl: String? = null,
)
