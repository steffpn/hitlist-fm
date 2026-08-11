package fm.hitlist.app.ui.screens.songs

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import fm.hitlist.app.data.model.SongsResponse
import fm.hitlist.app.data.remote.OnairApi
import fm.hitlist.app.ui.components.Period
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Songs tab: role-scoped list of what aired, ranked by plays. */
class SongsViewModel(private val api: OnairApi) : ViewModel() {

    var data by mutableStateOf<SongsResponse?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var period by mutableStateOf(Period.WEEK)
        private set
    var query by mutableStateOf("")
        private set

    private var searchJob: Job? = null

    init {
        load()
    }

    fun refresh() = load()

    fun selectPeriod(next: Period) {
        if (next == period) return
        period = next
        load()
    }

    /** Debounced so typing does not fire a request per keystroke. */
    fun onQueryChange(next: String) {
        query = next
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300)
            load()
        }
    }

    private fun load() {
        viewModelScope.launch {
            isLoading = true
            error = null
            try {
                data = api.getSongs(
                    period = period.value,
                    q = query.trim().takeIf { it.isNotEmpty() },
                )
            } catch (e: Exception) {
                error = e.message ?: "Failed to load songs"
            } finally {
                isLoading = false
            }
        }
    }
}
