package fm.hitlist.app.data.model

import kotlinx.serialization.Serializable

// GET /songs — role-scoped song list for a period.
//
// One shape for every role: the backend decides whether "songs" means an artist's
// monitored tracks, a label's roster or everything a station aired.

@Serializable
data class StationPlays(
    val name: String = "",
    val plays: Int = 0,
)

@Serializable
data class SongRow(
    val isrc: String? = null,
    val songTitle: String = "",
    val artistName: String = "",
    val plays: Int = 0,
    val stationCount: Int = 0,
    val byStation: List<StationPlays> = emptyList(),
)

@Serializable
data class SongsResponse(
    val period: String = "week",
    val periodStart: String? = null,
    val totalPlays: Int = 0,
    val uniqueSongs: Int = 0,
    val stations: List<StationPlays> = emptyList(),
    val songs: List<SongRow> = emptyList(),
    /** True when the list was capped — say so rather than imply it is complete. */
    val truncated: Boolean = false,
)
