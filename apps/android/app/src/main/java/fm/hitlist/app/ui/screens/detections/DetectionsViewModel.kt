package fm.hitlist.app.ui.screens.detections

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.OffsetDateTime
import java.time.ZoneId
import fm.hitlist.app.data.model.AirplayEvent
import fm.hitlist.app.data.model.Station
import fm.hitlist.app.data.remote.OnairApi

/**
 * One row of the feed: every play of the same song, on the same station, on the
 * same local day. A group of one renders exactly like a plain detection.
 */
data class DetectionGroup(
    val key: String,
    /** Newest first — the feed is ordered by startedAt descending. */
    val events: List<AirplayEvent>,
) {
    val latest: AirplayEvent get() = events.first()

    /**
     * playCount is summed rather than counted: the backend already merges the
     * consecutive callbacks of a single airing into one event and records how
     * many it merged.
     */
    val totalPlays: Int get() = events.sumOf { maxOf(1, it.playCount) }

    val isCollapsible: Boolean get() = events.size > 1
}

/** Detections list: cursor pagination + search/station/date filters. */
class DetectionsViewModel(private val api: OnairApi) : ViewModel() {

    var items by mutableStateOf<List<AirplayEvent>>(emptyList())
        private set

    /**
     * [items] collapsed by (local day, station, song). Radio rotation puts one
     * track on air a dozen times a day, which buried everything else in the feed.
     *
     * Grouping stays within a station on purpose — the same song on Kiss FM and on
     * Virgin are two different facts, and every row names its station. It is also
     * computed over the loaded pages only, so a group grows as the user scrolls;
     * that is the honest behaviour for a cursor-paginated feed, the alternative
     * being a count that contradicts the rows beneath it.
     */
    val groups: List<DetectionGroup>
        get() = items
            .groupBy { event ->
                val song = event.isrc?.takeIf { it.isNotBlank() }
                    ?: "${event.artistName}|${event.songTitle}"
                "${localDay(event.startedAt)}|${event.stationId}|$song"
            }
            .map { (key, events) -> DetectionGroup(key, events) }

    /**
     * Local calendar day of an ISO instant. Slicing the first 10 characters would
     * give the UTC date and split a Bucharest evening across two groups.
     */
    private fun localDay(iso: String?): String {
        if (iso.isNullOrBlank()) return ""
        return try {
            OffsetDateTime.parse(iso)
                .atZoneSameInstant(ZoneId.systemDefault())
                .toLocalDate()
                .toString()
        } catch (_: Exception) {
            iso.take(10)
        }
    }
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
