package fm.hitlist.app.data.model

import kotlinx.serialization.Serializable

/**
 * GET /label/comparison?artistIds=1,2,3&period=week
 * Compares daily play counts across multiple label artists.
 *
 * Backend shape (getArtistComparison handler, camelCase, no naming strategy):
 *   { artists: [ { artistName: string, dailyPlays: [ { date: string, count: number } ] } ] }
 *
 * All fields defaulted / nullable defensively.
 */
@Serializable
data class LabelComparisonResponse(
    val artists: List<LabelComparisonArtist> = emptyList(),
)

@Serializable
data class LabelComparisonArtist(
    val artistName: String = "",
    val dailyPlays: List<LabelComparisonDailyPlay> = emptyList(),
)

@Serializable
data class LabelComparisonDailyPlay(
    val date: String = "",
    val count: Int = 0,
)
