package music.onair.app.core

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.media3.common.AudioAttributes
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import music.onair.app.data.remote.OnairApi

/**
 * Single-active audio snippet playback (ported from iOS AudioPlayerManager).
 * Fetches a presigned URL from the backend, then plays via ExoPlayer.
 * Exposes Compose state so screens observe playback directly.
 */
class AudioPlayerManager(
    private val context: Context,
    private val api: OnairApi,
) {
    var currentlyPlayingId by mutableStateOf<Int?>(null)
        private set
    var isPlaying by mutableStateOf(false)
        private set
    var isLoading by mutableStateOf(false)
        private set
    var progress by mutableFloatStateOf(0f)
        private set

    // Now-playing metadata for the persistent NowPlayingBar.
    var nowPlayingTitle by mutableStateOf<String?>(null)
        private set
    var nowPlayingSubtitle by mutableStateOf<String?>(null)
        private set

    private var player: ExoPlayer? = null
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var progressJob: Job? = null

    /** Toggle play/pause/resume for an event; fetches the snippet URL on first play. */
    fun toggle(eventId: Int, title: String? = null, subtitle: String? = null) {
        if (currentlyPlayingId == eventId && player != null) {
            if (isPlaying) player?.pause() else player?.play()
            return
        }

        stop()
        currentlyPlayingId = eventId
        nowPlayingTitle = title
        nowPlayingSubtitle = subtitle
        isLoading = true

        scope.launch {
            try {
                val res = api.getSnippetUrl(eventId)
                if (currentlyPlayingId != eventId) return@launch
                isLoading = false
                val p = ensurePlayer()
                p.setMediaItem(MediaItem.fromUri(res.url))
                p.prepare()
                p.playWhenReady = true
                startProgressTracking()
            } catch (e: Exception) {
                isLoading = false
                stop()
            }
        }
    }

    fun pause() {
        player?.pause()
    }

    fun resume() {
        player?.play()
    }

    private fun ensurePlayer(): ExoPlayer {
        return player ?: ExoPlayer.Builder(context).build().also { exo ->
            // Proper audio focus: pause other apps' music, duck for notifications,
            // and stop when another app takes focus (handleAudioFocus = true).
            exo.setAudioAttributes(AudioAttributes.DEFAULT, true)
            exo.addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(state: Int) {
                    if (state == Player.STATE_ENDED) stop()
                }
                override fun onIsPlayingChanged(playing: Boolean) {
                    isPlaying = playing
                }
            })
            player = exo
        }
    }

    private fun startProgressTracking() {
        progressJob?.cancel()
        progressJob = scope.launch {
            while (isActive) {
                val p = player
                val dur = p?.duration ?: 0L
                if (p != null && dur > 0) {
                    progress = (p.currentPosition.toFloat() / dur).coerceIn(0f, 1f)
                }
                delay(100)
            }
        }
    }

    fun stop() {
        progressJob?.cancel()
        progressJob = null
        player?.stop()
        player?.clearMediaItems()
        currentlyPlayingId = null
        nowPlayingTitle = null
        nowPlayingSubtitle = null
        isPlaying = false
        isLoading = false
        progress = 0f
    }

    fun isActiveEvent(eventId: Int): Boolean = currentlyPlayingId == eventId
}
