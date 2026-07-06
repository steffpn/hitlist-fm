package fm.hitlist.app.ui.screens.settings

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import fm.hitlist.app.data.model.PreferencesSettingsPatch
import fm.hitlist.app.data.model.PreferencesSettingsResponse
import fm.hitlist.app.data.remote.OnairApi

class PreferencesViewModel(private val api: OnairApi) : ViewModel() {
    var data by mutableStateOf<PreferencesSettingsResponse?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    // Non-null while a toggle PATCH is in flight; surfaced as a small inline notice.
    var updateError by mutableStateOf<String?>(null)
        private set

    init {
        load()
    }

    fun refresh() = load()

    fun onDailyReportEnabledChange(enabled: Boolean) {
        patch(
            optimistic = { it.copy(dailyReportEnabled = enabled) },
            body = PreferencesSettingsPatch(dailyReportEnabled = enabled),
        )
    }

    fun onWeeklyReportEnabledChange(enabled: Boolean) {
        patch(
            optimistic = { it.copy(weeklyReportEnabled = enabled) },
            body = PreferencesSettingsPatch(weeklyReportEnabled = enabled),
        )
    }

    fun onChartAlertsEnabledChange(enabled: Boolean) {
        patch(
            optimistic = { it.copy(chartAlertsEnabled = enabled) },
            body = PreferencesSettingsPatch(chartAlertsEnabled = enabled),
        )
    }

    /** Time in "HH:mm" (server pattern ^\d{2}:\d{2}$). */
    fun onDailyReportTimeChange(time: String) {
        patch(
            optimistic = { it.copy(dailyReportTime = time) },
            body = PreferencesSettingsPatch(dailyReportTime = time),
        )
    }

    fun onTimezoneChange(timezone: String) {
        patch(
            optimistic = { it.copy(dailyReportTimezone = timezone) },
            body = PreferencesSettingsPatch(dailyReportTimezone = timezone),
        )
    }

    fun toggleChartAlertCountry(country: String) {
        val current = data?.chartAlertCountries ?: return
        val next = if (country in current) current - country else current + country
        patch(
            optimistic = { it.copy(chartAlertCountries = next) },
            body = PreferencesSettingsPatch(chartAlertCountries = next),
        )
    }

    private fun patch(
        optimistic: (PreferencesSettingsResponse) -> PreferencesSettingsResponse,
        body: PreferencesSettingsPatch,
    ) {
        val previous = data ?: return
        // Optimistic local update.
        data = optimistic(previous)
        updateError = null
        viewModelScope.launch {
            try {
                data = api.updateSettings(body)
            } catch (e: Exception) {
                // Revert on failure.
                data = previous
                updateError = e.message ?: "Failed to update setting"
            }
        }
    }

    private fun load() {
        viewModelScope.launch {
            isLoading = true
            error = null
            try {
                data = api.getSettings()
            } catch (e: Exception) {
                error = e.message ?: "Failed to load preferences"
            } finally {
                isLoading = false
            }
        }
    }
}
