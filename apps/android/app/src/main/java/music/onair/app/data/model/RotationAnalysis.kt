package music.onair.app.data.model

import kotlinx.serialization.Serializable

// GET /station/rotation?period
@Serializable
data class RotationHourBucket(
    val hour: Int = 0,
    val count: Int = 0,
)

@Serializable
data class OverRotatedSongItem(
    val songTitle: String = "",
    val artistName: String = "",
    val playCount: Int = 0,
    val expectedMax: Int = 0,
)

@Serializable
data class RotationAnalysisResponse(
    val uniqueSongsPerHour: List<RotationHourBucket> = emptyList(),
    val averageRotation: Double = 0.0,
    val overRotatedSongs: List<OverRotatedSongItem> = emptyList(),
)
