package fm.hitlist.app.ui.screens.artist

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import fm.hitlist.app.data.model.AddSongRequest
import fm.hitlist.app.data.model.BrowseTrack
import fm.hitlist.app.data.model.MonitoredSong
import fm.hitlist.app.data.remote.OnairApi
import retrofit2.HttpException

class MonitoredSongsViewModel(private val api: OnairApi) : ViewModel() {
    var songs by mutableStateOf<List<MonitoredSong>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    // ── Add Song sheet: catalog search (GET /artist/browse-tracks) ──
    var searchQuery by mutableStateOf("")
        private set
    var searchResults by mutableStateOf<List<BrowseTrack>>(emptyList())
        private set
    var isSearching by mutableStateOf(false)
        private set
    var isSaving by mutableStateOf(false)
        private set
    var addError by mutableStateOf<String?>(null)
        private set

    private var searchJob: Job? = null

    init {
        load()
    }

    fun refresh() = load()

    fun onSearchQueryChange(q: String) {
        searchQuery = q
        addError = null
        searchJob?.cancel()
        if (q.trim().length < 2) {
            searchResults = emptyList()
            isSearching = false
            return
        }
        searchJob = viewModelScope.launch {
            delay(300) // debounce
            isSearching = true
            try {
                searchResults = api.browseTracks(q.trim())
            } catch (_: Exception) {
                searchResults = emptyList()
            } finally {
                isSearching = false
            }
        }
    }

    fun resetAddSheet() {
        searchJob?.cancel()
        searchQuery = ""
        searchResults = emptyList()
        isSearching = false
        isSaving = false
        addError = null
    }

    /** POST /artist/songs — used by both catalog selection and manual entry. */
    fun addSong(songTitle: String, artistName: String, isrc: String, onSuccess: () -> Unit) {
        if (isSaving) return
        viewModelScope.launch {
            isSaving = true
            addError = null
            try {
                api.addArtistSong(
                    AddSongRequest(
                        songTitle = songTitle.trim(),
                        artistName = artistName.trim(),
                        isrc = isrc.trim(),
                    ),
                )
                load()
                onSuccess()
            } catch (e: Exception) {
                addError = humanAddError(e)
            } finally {
                isSaving = false
            }
        }
    }

    /** DELETE /artist/songs/:id */
    fun deleteSong(id: Int) {
        viewModelScope.launch {
            try {
                api.deleteArtistSong(id)
                songs = songs.filterNot { it.id == id }
            } catch (e: Exception) {
                error = e.message ?: "Failed to delete song"
            }
        }
    }

    private fun humanAddError(e: Exception): String = when {
        e is HttpException && e.code() == 409 -> "You're already monitoring a song with this ISRC."
        e is HttpException && e.code() == 403 -> {
            val body = e.response()?.errorBody()?.string().orEmpty()
            when {
                body.contains("own songs") -> "Artists can only monitor their own songs."
                body.contains("Premium") || body.contains("Upgrade") ->
                    "Free plan limit reached. Upgrade to monitor more songs."
                else -> "Not allowed to add this song."
            }
        }
        else -> e.message ?: "Failed to add song"
    }

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
