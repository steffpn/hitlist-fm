package fm.hitlist.app.ui.screens.detections

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import fm.hitlist.app.data.model.AirplayEvent
import fm.hitlist.app.data.model.Station
import fm.hitlist.app.data.remote.OnairApi

/** Detections list: cursor pagination + search/station/date filters. */
class DetectionsViewModel(private val api: OnairApi) : ViewModel() {

    var items by mutableStateOf<List<AirplayEvent>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
        private set
    var isLoadingMore by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    // ── Filters ──
    var query by mutableStateOf("")
        private set
    var stationId by mutableStateOf<Int?>(null)
        private set
    var stationName by mutableStateOf<String?>(null)
        private set
    var startDate by mutableStateOf<String?>(null) // YYYY-MM-DD
        private set
    var endDate by mutableStateOf<String?>(null) // YYYY-MM-DD
        private set

    // Station picker data (lazy-loaded when the sheet opens).
    var stations by mutableStateOf<List<Station>>(emptyList())
        private set

    val hasActiveFilters: Boolean
        get() = query.isNotBlank() || stationId != null || startDate != null

    private var nextCursor: Int? = null
    private var searchJob: Job? = null

    init {
        loadInitial()
    }

    fun onQueryChange(newQuery: String) {
        query = newQuery
        // Debounced server-side search (300ms).
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300)
            loadInitial()
        }
    }

    fun selectStation(id: Int?, name: String?) {
        stationId = id
        stationName = name
        loadInitial()
    }

    fun selectDateRange(start: String?, end: String?) {
        startDate = start
        endDate = end
        loadInitial()
    }

    fun loadStations() {
        if (stations.isNotEmpty()) return
        viewModelScope.launch {
            try {
                stations = api.getStations().sortedBy { it.name.lowercase() }
            } catch (_: Exception) {
                // picker shows empty list; not fatal
            }
        }
    }

    fun loadInitial() {
        viewModelScope.launch {
            isLoading = true
            error = null
            nextCursor = null
            try {
                val res = api.getAirplayEvents(
                    limit = PAGE_SIZE,
                    cursor = null,
                    query = query.trim().takeIf { it.isNotEmpty() },
                    startDate = startDate,
                    endDate = endDate,
                    stationId = stationId,
                )
                items = res.data
                nextCursor = res.nextCursor
            } catch (e: Exception) {
                error = e.message ?: "Failed to load detections"
            } finally {
                isLoading = false
            }
        }
    }

    fun loadMore() {
        if (isLoadingMore || isLoading || nextCursor == null) return
        viewModelScope.launch {
            isLoadingMore = true
            try {
                val res = api.getAirplayEvents(
                    limit = PAGE_SIZE,
                    cursor = nextCursor,
                    query = query.trim().takeIf { it.isNotEmpty() },
                    startDate = startDate,
                    endDate = endDate,
                    stationId = stationId,
                )
                items = items + res.data
                nextCursor = res.nextCursor
            } catch (_: Exception) {
                // keep existing items; surface nothing for background paging
            } finally {
                isLoadingMore = false
            }
        }
    }

    fun refresh() = loadInitial()

    private companion object {
        const val PAGE_SIZE = 20
    }
}
