package music.onair.app.data.model

import kotlinx.serialization.Serializable

// POST /notifications/device-token
@Serializable
data class DeviceTokenRequest(
    val token: String,
    val platform: String = "android",
    val environment: String = "production",
)

@Serializable
data class SimpleSuccess(
    val success: Boolean = true,
)

// GET /notifications/digest/:date?type=daily|weekly
// Shape matches DigestDetailResponseSchema (apps/api/src/routes/v1/notifications/schema.ts).
@Serializable
data class DigestTopItem(
    val title: String = "",
    val artist: String? = null,
    val name: String? = null,
    val count: Int = 0,
)

@Serializable
data class DigestDetail(
    val playCount: Int = 0,
    val topSong: DigestTopItem? = null,
    val topStation: DigestTopItem? = null,
    val weekOverWeekChange: Double? = null,
    val newStationsCount: Int? = null,
)
