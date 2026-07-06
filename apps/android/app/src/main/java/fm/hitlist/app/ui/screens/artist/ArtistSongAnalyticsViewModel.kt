package fm.hitlist.app.ui.screens.artist

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import fm.hitlist.app.data.model.SongAnalyticsResponse
import fm.hitlist.app.data.model.SongHourlyHeatmapResponse
import fm.hitlist.app.data.model.SongStationBreakdownItem
import fm.hitlist.app.data.remote.OnairApi

class ArtistSongAnalyticsViewModel(
    private val api: OnairApi,
    private val songId: Int,
) : ViewModel() {
    var analytics by mutableStateOf<SongAnalyticsResponse?>(null)
        private set
    var stationBreakdown by mutableStateOf<List<SongStationBreakdownItem>>(emptyList())
        private set
    var heatmap by mutableStateOf<SongHourlyHeatmapResponse?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    init {
        load()
    }

    fun refresh() = load()

    private fun load() {
        viewModelScope.launch {
            isLoading = true
            error = null
            try {
                coroutineScope {
                    val analyticsDeferred = async { api.getSongAnalytics(songId) }
                    val breakdownDeferred = async { api.getSongStationBreakdown(songId) }
                    val heatmapDeferred = async { api.getSongHourlyHeatmap(songId) }

                    analytics = analyticsDeferred.await()
                    stationBreakdown = breakdownDeferred.await()
                    heatmap = heatmapDeferred.await()
                }
            } catch (e: Exception) {
                error = e.message ?: "Failed to load analytics"
            } finally {
                isLoading = false
            }
        }
    }
}
