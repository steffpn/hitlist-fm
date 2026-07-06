package fm.hitlist.app.ui.screens.label

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import fm.hitlist.app.data.model.LabelArtistItem
import fm.hitlist.app.data.remote.OnairApi

class LabelArtistsViewModel(private val api: OnairApi) : ViewModel() {
    var data by mutableStateOf<List<LabelArtistItem>?>(null)
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
                data = api.getLabelArtists()
            } catch (e: Exception) {
                error = e.message ?: "Failed to load artists"
            } finally {
                isLoading = false
            }
        }
    }
}
