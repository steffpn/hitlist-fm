package music.onair.app.data.model

import kotlinx.serialization.Serializable

// GET /station/discovery-score?period
// Percentage of this station's recent airplay made up of "new songs"
// (ISRCs first seen across all stations in the last 30 days).
@Serializable
data class DiscoveryScoreResponse(
    val score: Double = 0.0,
    val newSongsCount: Int = 0,
    val totalSongsCount: Int = 0,
    val newSongsPlays: Int = 0,
    val totalPlays: Int = 0,
)
