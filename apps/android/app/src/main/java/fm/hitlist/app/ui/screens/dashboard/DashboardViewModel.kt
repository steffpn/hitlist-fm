package fm.hitlist.app.ui.screens.dashboard

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import fm.hitlist.app.data.model.DashboardSummaryResponse
import fm.hitlist.app.data.model.StationPlayCount
import fm.hitlist.app.data.remote.OnairApi
import fm.hitlist.app.ui.components.Period

/** Admin dashboard: play-count summary + top stations for the selected period. */
class DashboardViewModel(private val api: OnairApi) : ViewModel() {

    var period by mutableStateOf(Period.WEEK)
        private set
    var summary by mutableStateOf<DashboardSummaryResponse?>(null)
        private set
    var topStations by mutableStateOf<List<StationPlayCount>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    init {
        load()
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
                coroutineScope {
                    val summaryDeferred = async { api.getDashboardSummary(period.value) }
                    val stationsDeferred = async { api.getTopStations(period.value, 10) }
                    summary = summaryDeferred.await()
                    topStations = stationsDeferred.await().stations
                }
            } catch (e: Exception) {
                error = e.message ?: "Failed to load dashboard"
            } finally {
                isLoading = false
            }
        }
    }
}
