package fm.hitlist.app.ui.screens.label

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import fm.hitlist.app.data.model.LabelArtistItem
import fm.hitlist.app.data.model.LabelComparisonResponse
import fm.hitlist.app.data.remote.OnairApi
import fm.hitlist.app.ui.components.Period

/**
 * Loads the label's selectable artists (GET /label/artists), lets the user pick
 * up to 3 by id, then fetches GET /label/comparison for the chosen ids + period.
 */
class LabelComparisonViewModel(private val api: OnairApi) : ViewModel() {
    // Selectable artist list.
    var artists by mutableStateOf<List<LabelArtistItem>?>(null)
        private set
    var isLoadingArtists by mutableStateOf(false)
        private set
    var artistsError by mutableStateOf<String?>(null)
        private set

    // Current multi-selection (artist ids), capped at 3.
    var selectedIds by mutableStateOf<Set<Int>>(emptySet())
        private set

    var period by mutableStateOf(Period.WEEK)
        private set

    // Comparison result.
    var comparison by mutableStateOf<LabelComparisonResponse?>(null)
        private set
    var isComparing by mutableStateOf(false)
        private set
    var comparisonError by mutableStateOf<String?>(null)
        private set

    val maxSelection: Int = 3

    init {
        loadArtists()
    }

    fun refresh() = loadArtists()

    fun toggleArtist(id: Int) {
        val current = selectedIds
        selectedIds = when {
            current.contains(id) -> current - id
            current.size >= maxSelection -> current
            else -> current + id
        }
    }

    fun onPeriodChange(next: Period) {
        if (next == period) return
        period = next
        // Refresh existing comparison under the new period if one is showing.
        if (comparison != null && selectedIds.isNotEmpty()) {
            compare()
        }
    }

    fun compare() {
        val ids = selectedIds
        if (ids.isEmpty()) return
        viewModelScope.launch {
            isComparing = true
            comparisonError = null
            try {
                comparison = api.getLabelComparison(
                    artistIds = ids.joinToString(","),
                    period = period.value,
                )
            } catch (e: Exception) {
                comparisonError = e.message ?: "Failed to load comparison"
            } finally {
                isComparing = false
            }
        }
    }

    private fun loadArtists() {
        viewModelScope.launch {
            isLoadingArtists = true
            artistsError = null
            try {
                artists = api.getLabelArtists()
            } catch (e: Exception) {
                artistsError = e.message ?: "Failed to load artists"
            } finally {
                isLoadingArtists = false
            }
        }
    }
}
