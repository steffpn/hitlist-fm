package fm.hitlist.app.data.model

import kotlinx.serialization.Serializable

// GET /label/station-affinity — bare array of stations ranked by affinity %.
@Serializable
data class StationAffinityItem(
    val stationId: Int = 0,
    val stationName: String = "",
    val logoUrl: String? = null,
    val labelPlays: Int = 0,
    val totalStationPlays: Int = 0,
    val affinityPercent: Double = 0.0,
)
