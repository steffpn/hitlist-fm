package fm.hitlist.app.ui.screens.artist

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import fm.hitlist.app.data.model.ArtistDashboardResponse
import fm.hitlist.app.data.remote.OnairApi
import fm.hitlist.app.ui.components.Period

class ArtistDashboardViewModel(private val api: OnairApi) : ViewModel() {
    var data by mutableStateOf<ArtistDashboardResponse?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    /** Reporting period the dashboard totals and station breakdown are scoped to. */
    var period by mutableStateOf(Period.WEEK)
        private set

    init {
        load()
    }

    fun refresh() = load()

    fun selectPeriod(next: Period) {
        if (next == period) return
        period = next
        load()
    }

    private fun load() {
        viewModelScope.launch {
            isLoading = true
            error = null
            try {
                data = api.getArtistDashboard(period.value)
            } catch (e: Exception) {
                error = e.message ?: "Failed to load dashboard"
            } finally {
                isLoading = false
            }
        }
    }
}
