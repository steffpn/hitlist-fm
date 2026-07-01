package music.onair.app.ui.screens.detections

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import music.onair.app.data.model.AirplayEvent
import music.onair.app.data.remote.OnairApi

/** Detections list: cursor pagination, ported from iOS DetectionsViewModel. */
class DetectionsViewModel(private val api: OnairApi) : ViewModel() {

    var items by mutableStateOf<List<AirplayEvent>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
        private set
    var isLoadingMore by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    private var nextCursor: Int? = null

    init {
        loadInitial()
    }

    fun loadInitial() {
        viewModelScope.launch {
            isLoading = true
            error = null
            nextCursor = null
            try {
                val res = api.getAirplayEvents(limit = PAGE_SIZE, cursor = null)
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
                val res = api.getAirplayEvents(limit = PAGE_SIZE, cursor = nextCursor)
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
