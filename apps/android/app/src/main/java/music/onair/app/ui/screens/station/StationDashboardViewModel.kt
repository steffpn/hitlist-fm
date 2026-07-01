package music.onair.app.ui.screens.station

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import music.onair.app.data.model.StationOverview
import music.onair.app.data.model.StationTopSong
import music.onair.app.data.remote.OnairApi
import music.onair.app.ui.components.Period

class StationDashboardViewModel(private val api: OnairApi) : ViewModel() {
    var period by mutableStateOf(Period.WEEK)
        private set
    var overview by mutableStateOf<StationOverview?>(null)
        private set
    var topSongs by mutableStateOf<List<StationTopSong>>(emptyList())
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
                    val o = async { api.getStationOverview(period.value) }
                    val t = async { api.getStationTopSongs(period.value, 20) }
                    overview = o.await()
                    topSongs = t.await()
                }
            } catch (e: Exception) {
                error = e.message ?: "Failed to load station"
            } finally {
                isLoading = false
            }
        }
    }
}
