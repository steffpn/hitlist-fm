package music.onair.app.ui.screens.station

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import music.onair.app.data.model.AddWatchedStationRequest
import music.onair.app.data.model.CompetitorDetailResponse
import music.onair.app.data.model.CompetitorSummaryItem
import music.onair.app.data.model.Station
import music.onair.app.data.remote.OnairApi
import music.onair.app.ui.components.Period
import retrofit2.HttpException

class CompetitorsViewModel(private val api: OnairApi) : ViewModel() {
    var period by mutableStateOf(Period.WEEK)
        private set
    var summary by mutableStateOf<List<CompetitorSummaryItem>?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    // Detail sub-screen state (for the tapped competitor).
    var detail by mutableStateOf<CompetitorDetailResponse?>(null)
        private set
    var detailLoading by mutableStateOf(false)
        private set
    var detailError by mutableStateOf<String?>(null)
        private set
    var selectedStationId by mutableStateOf<Int?>(null)
        private set
    var selectedStationName by mutableStateOf<String?>(null)
        private set

    // ── Add-competitor picker ──
    var pickerStations by mutableStateOf<List<Station>>(emptyList())
        private set
    var pickerLoading by mutableStateOf(false)
        private set
    var pickerError by mutableStateOf<String?>(null)
        private set
    var isMutating by mutableStateOf(false)
        private set

    init {
        load()
    }

    fun selectPeriod(newPeriod: Period) {
        if (newPeriod == period) return
        period = newPeriod
        load()
        // Refresh the open detail (if any) for the new period.
        val id = selectedStationId
        if (id != null) loadDetail(id)
    }

    fun refresh() = load()

    private fun load() {
        viewModelScope.launch {
            isLoading = true
            error = null
            try {
                summary = api.getCompetitorSummary(period.value)
            } catch (e: Exception) {
                error = e.message ?: "Failed to load competitors"
            } finally {
                isLoading = false
            }
        }
    }

    /** Loads all stations minus the ones already watched and the user's own. */
    fun loadPickerStations() {
        viewModelScope.launch {
            pickerLoading = true
            pickerError = null
            try {
                val all = api.getStations()
                val watchedIds = api.getWatchedStations().map { it.stationId }.toSet()
                val ownIds = try {
                    api.getOwnStations().stationIds.toSet()
                } catch (_: Exception) {
                    emptySet()
                }
                pickerStations = all
                    .filter { it.id !in watchedIds && it.id !in ownIds }
                    .sortedBy { it.name.lowercase() }
            } catch (e: Exception) {
                pickerError = e.message ?: "Failed to load stations"
            } finally {
                pickerLoading = false
            }
        }
    }

    /** POST /competitors/watched — body key MUST be {stationId} (iOS fix 2cfdde6). */
    fun addCompetitor(stationId: Int, onSuccess: () -> Unit) {
        if (isMutating) return
        viewModelScope.launch {
            isMutating = true
            pickerError = null
            try {
                api.addWatchedStation(AddWatchedStationRequest(stationId = stationId))
                load()
                onSuccess()
            } catch (e: Exception) {
                pickerError = if (e is HttpException && e.code() == 400) {
                    "Couldn't add this station (limit reached or it's your own station)."
                } else {
                    e.message ?: "Failed to add competitor"
                }
            } finally {
                isMutating = false
            }
        }
    }

    /** DELETE /competitors/watched/:stationId */
    fun removeCompetitor(stationId: Int) {
        viewModelScope.launch {
            try {
                api.removeWatchedStation(stationId)
                summary = summary?.filterNot { it.stationId == stationId }
            } catch (e: Exception) {
                error = e.message ?: "Failed to remove competitor"
            }
        }
    }

    fun openDetail(stationId: Int, stationName: String) {
        selectedStationId = stationId
        selectedStationName = stationName
        loadDetail(stationId)
    }

    fun closeDetail() {
        selectedStationId = null
        selectedStationName = null
        detail = null
        detailError = null
    }

    fun retryDetail() {
        val id = selectedStationId ?: return
        loadDetail(id)
    }

    private fun loadDetail(stationId: Int) {
        viewModelScope.launch {
            detailLoading = true
            detailError = null
            try {
                detail = api.getCompetitorDetail(stationId, period.value)
            } catch (e: Exception) {
                detailError = e.message ?: "Failed to load competitor detail"
            } finally {
                detailLoading = false
            }
        }
    }
}
