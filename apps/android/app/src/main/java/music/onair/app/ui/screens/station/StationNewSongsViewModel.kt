package music.onair.app.ui.screens.station

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import music.onair.app.data.model.NewSongItem
import music.onair.app.data.remote.OnairApi

class StationNewSongsViewModel(private val api: OnairApi) : ViewModel() {
    var songs by mutableStateOf<List<NewSongItem>?>(null)
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
                songs = api.getStationNewSongs()
            } catch (e: Exception) {
                error = e.message ?: "Failed to load new songs"
            } finally {
                isLoading = false
            }
        }
    }
}
