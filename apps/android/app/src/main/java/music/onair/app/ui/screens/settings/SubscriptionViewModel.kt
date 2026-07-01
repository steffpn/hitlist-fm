package music.onair.app.ui.screens.settings

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import music.onair.app.data.model.SubscriptionInfoResponse
import music.onair.app.data.remote.OnairApi

class SubscriptionViewModel(private val api: OnairApi) : ViewModel() {
    var data by mutableStateOf<SubscriptionInfoResponse?>(null)
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
                data = api.getSubscription()
            } catch (e: Exception) {
                error = e.message ?: "Failed to load subscription"
            } finally {
                isLoading = false
            }
        }
    }
}
