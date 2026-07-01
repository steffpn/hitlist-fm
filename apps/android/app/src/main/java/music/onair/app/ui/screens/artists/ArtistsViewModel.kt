package music.onair.app.ui.screens.artists

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import music.onair.app.data.model.AirplayEvent
import music.onair.app.data.remote.OnairApi

/** Aggregated artist row (computed client-side from airplay events, like iOS). */
data class ArtistSummary(
    val name: String,
    val playCount: Int,
    val songCount: Int,
    val lastDetectedAt: String?,
    val topSong: String?,
    val stationCount: Int,
)

class ArtistsViewModel(private val api: OnairApi) : ViewModel() {

    var artists by mutableStateOf<List<ArtistSummary>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var query by mutableStateOf("")
        private set

    val filtered: List<ArtistSummary>
        get() = if (query.isBlank()) artists
        else artists.filter { it.name.contains(query.trim(), ignoreCase = true) }

    init {
        load()
    }

    fun onQueryChange(q: String) {
        query = q
    }

    fun refresh() = load()

    private fun load() {
        viewModelScope.launch {
            isLoading = true
            error = null
            try {
                val all = mutableListOf<AirplayEvent>()
                var cursor: Int? = null
                var pages = 0
                while (pages < 5) {
                    val res = api.getAirplayEvents(limit = 50, cursor = cursor)
                    all += res.data
                    cursor = res.nextCursor
                    pages++
                    if (cursor == null) break
                }
                artists = aggregate(all)
            } catch (e: Exception) {
                error = e.message ?: "Failed to load artists"
            } finally {
                isLoading = false
            }
        }
    }

    private fun aggregate(events: List<AirplayEvent>): List<ArtistSummary> {
        return events.groupBy { it.artistName }
            .map { (name, evs) ->
                val topSong = evs.groupBy { it.songTitle }
                    .mapValues { entry -> entry.value.sumOf { it.playCount } }
                    .maxByOrNull { it.value }?.key
                ArtistSummary(
                    name = name,
                    playCount = evs.sumOf { it.playCount },
                    songCount = evs.map { it.songTitle }.toSet().size,
                    lastDetectedAt = evs.mapNotNull { it.startedAt }.maxOrNull(),
                    topSong = topSong,
                    stationCount = evs.mapNotNull { it.station?.name }.toSet().size,
                )
            }
            .sortedByDescending { it.playCount }
    }
}
