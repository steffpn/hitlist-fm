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
