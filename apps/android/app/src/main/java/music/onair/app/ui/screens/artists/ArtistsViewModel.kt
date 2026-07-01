package music.onair.app.ui.screens.artists

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import music.onair.app.data.model.ArtistsSummaryItem
import music.onair.app.data.remote.OnairApi
import music.onair.app.ui.components.Period

/** Admin Artists tab: server-side aggregation via GET /artists/summary. */
class ArtistsViewModel(private val api: OnairApi) : ViewModel() {

    var artists by mutableStateOf<List<ArtistsSummaryItem>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var query by mutableStateOf("")
        private set
    var period by mutableStateOf(Period.WEEK)
        private set

    val filtered: List<ArtistsSummaryItem>
        get() = if (query.isBlank()) artists
        else artists.filter { it.artistName.contains(query.trim(), ignoreCase = true) }

    init {
        load()
    }

    fun onQueryChange(q: String) {
        query = q
    }

    fun selectPeriod(newPeriod: Period) {
        if (newPeriod == period) return
        period = newPeriod
        load()
    }

    fun refresh() = load()

    private fun load() {
        viewModelScope.launch {
            isLoading = true
            error = null
            try {
                artists = api.getArtistsSummary(period = period.value, limit = 100)
            } catch (e: Exception) {
                error = e.message ?: "Failed to load artists"
            } finally {
                isLoading = false
            }
        }
    }
}
