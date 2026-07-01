package music.onair.app.data.model

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
