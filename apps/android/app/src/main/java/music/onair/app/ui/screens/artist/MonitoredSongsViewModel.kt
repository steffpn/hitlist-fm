package music.onair.app.ui.screens.artist

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import music.onair.app.data.model.MonitoredSong
import music.onair.app.data.remote.OnairApi

class MonitoredSongsViewModel(private val api: OnairApi) : ViewModel() {
    var songs by mutableStateOf<List<MonitoredSong>>(emptyList())
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
                songs = api.getArtistSongs()
            } catch (e: Exception) {
                error = e.message ?: "Failed to load songs"
            } finally {
                isLoading = false
            }
        }
    }
}
