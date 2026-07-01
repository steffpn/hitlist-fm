package music.onair.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class ImpersonationArtist(
    val name: String,
    val plays: Int = 0,
)

@Serializable
data class ImpersonationStation(
    val id: Int,
    val name: String,
)

// GET /admin/impersonation/options
@Serializable
data class ImpersonationOptions(
    val artists: List<ImpersonationArtist> = emptyList(),
    val stations: List<ImpersonationStation> = emptyList(),
)

// POST /admin/impersonation/configure (null fields omitted via explicitNulls=false)
@Serializable
data class ConfigureImpersonationRequest(
    val role: String,
    val artistName: String? = null,
    val stationId: Int? = null,
    val artistNames: List<String>? = null,
)

@Serializable
data class ImpersonationConfigResult(
    val userId: Int,
    val role: String,
    val displayName: String = "",
)
