package fm.hitlist.app.ui.screens.artist

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import fm.hitlist.app.core.ServiceLocator
import fm.hitlist.app.data.model.AirplayEvent
import fm.hitlist.app.data.model.ArtistDashboardResponse
import fm.hitlist.app.data.remote.OnairApi
import fm.hitlist.app.ui.components.Period

/** Reorderable sections of the artist dashboard. */
enum class DashboardSection(val id: String, val title: String) {
    LATEST_PLAYS("latestPlays", "Latest plays"),
    AIRPLAY("airplay", "Airplay"),
    MOST_PLAYED("mostPlayed", "Most played"),
    STATIONS("stations", "Plays per station"),
    ;

    companion object {
        private const val KEY = "artistDashboard.sectionOrder"

        /**
         * Stored order, healed against the current build: unknown ids are dropped
         * and missing ones appended, so a stale value can never blank the dashboard.
         */
        fun load(): List<DashboardSection> {
            val stored = ServiceLocator.prefs.getString(KEY, null)
                ?.split(",")
                ?.mapNotNull { id -> entries.firstOrNull { it.id == id } }
                .orEmpty()
            if (stored.isEmpty()) return entries.toList()
            return stored + entries.filter { it !in stored }
        }

        fun save(order: List<DashboardSection>) {
            ServiceLocator.prefs.edit()
                .putString(KEY, order.joinToString(",") { it.id })
                .apply()
        }
    }
}

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

    /**
     * The few most recent airings, so opening the app answers "what just played"
     * without a detour through the Detections tab.
     */
    var latestPlays by mutableStateOf<List<AirplayEvent>>(emptyList())
        private set

    /** Section order, dragged by the user and kept on the device. */
    var sectionOrder by mutableStateOf(DashboardSection.load())
        private set

    fun reorder(order: List<DashboardSection>) {
        sectionOrder = order
        DashboardSection.save(order)
    }

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
                // Non-critical: the rest of the dashboard stays usable without it.
                latestPlays = runCatching { api.getAirplayEvents(limit = 5).data }
                    .getOrDefault(emptyList())
            } catch (e: Exception) {
                error = e.message ?: "Failed to load dashboard"
            } finally {
                isLoading = false
            }
        }
    }
}
