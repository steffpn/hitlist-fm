package music.onair.app.ui.screens.station

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import music.onair.app.data.model.RotationAnalysisResponse
import music.onair.app.data.remote.OnairApi
import music.onair.app.ui.components.Period

class RotationAnalysisViewModel(private val api: OnairApi) : ViewModel() {
    var period by mutableStateOf(Period.WEEK)
        private set
    var data by mutableStateOf<RotationAnalysisResponse?>(null)
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
                data = api.getRotationAnalysis(period.value)
            } catch (e: Exception) {
                error = e.message ?: "Failed to load rotation analysis"
            } finally {
                isLoading = false
            }
        }
    }
}
