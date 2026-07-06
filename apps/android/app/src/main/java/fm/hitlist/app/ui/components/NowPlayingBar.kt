package fm.hitlist.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import fm.hitlist.app.core.ServiceLocator
import fm.hitlist.app.ui.theme.RbAccent
import fm.hitlist.app.ui.theme.RbHairline
import fm.hitlist.app.ui.theme.RbSurface
import fm.hitlist.app.ui.theme.RbSurfaceLight
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextSecondary
import fm.hitlist.app.ui.theme.RbTextTertiary

/**
 * Persistent mini-player above the bottom nav (port of the iOS NowPlayingBar).
 * Visible while a broadcast snippet is loaded; observes AudioPlayerManager state.
 */
@Composable
fun NowPlayingBar() {
    val audio = ServiceLocator.audioPlayer
    if (audio.currentlyPlayingId == null || audio.isLoading) return

    Column(modifier = Modifier.fillMaxWidth().background(RbSurface)) {
        // Hairline + thin progress bar
        Box(Modifier.fillMaxWidth().height(1.dp).background(RbHairline))
        Box(Modifier.fillMaxWidth().height(3.dp).background(RbSurfaceLight)) {
            Box(
                Modifier
                    .fillMaxWidth(audio.progress.coerceIn(0f, 1f))
                    .height(3.dp)
                    .background(RbAccent),
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Filled.GraphicEq,
                contentDescription = null,
                tint = RbAccent,
                modifier = Modifier.size(16.dp),
            )
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    text = audio.nowPlayingTitle ?: "Broadcast Proof",
                    style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
                    color = RbTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                audio.nowPlayingSubtitle?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.labelSmall,
                        color = RbTextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            Spacer(Modifier.width(10.dp))
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.10f))
                    .clickable { if (audio.isPlaying) audio.pause() else audio.resume() },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = if (audio.isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                    contentDescription = if (audio.isPlaying) "Pause" else "Play",
                    tint = Color.White,
                    modifier = Modifier.size(18.dp),
                )
            }
            Spacer(Modifier.width(6.dp))
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .clickable { audio.stop() },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Close,
                    contentDescription = "Stop",
                    tint = RbTextTertiary,
                    modifier = Modifier.size(14.dp),
                )
            }
        }
    }
}
