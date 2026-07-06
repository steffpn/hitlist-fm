package music.onair.app.ui.screens.detections

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import music.onair.app.core.DateFormat
import music.onair.app.core.ServiceLocator
import music.onair.app.data.model.AirplayEvent
import music.onair.app.ui.theme.IbmPlexMono
import music.onair.app.ui.theme.RbAccent
import music.onair.app.ui.theme.RbAccentDark
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbGradientEnd
import music.onair.app.ui.theme.RbGradientStart
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.theme.RbTextTertiary

@Composable
fun SongDetailScreen(
    event: AirplayEvent,
    onBack: () -> Unit,
) {
    var coverUrl by remember(event.id) { mutableStateOf(event.artworkUrl) }
    var albumTitle by remember(event.id) { mutableStateOf<String?>(null) }
    var deezerTrackId by remember(event.id) { mutableStateOf<Long?>(null) }

    LaunchedEffect(event.id) {
        try {
            val q = "artist:\"${event.artistName}\" track:\"${event.songTitle}\""
            val res = ServiceLocator.deezerApi.search(q, 1)
            res.data.firstOrNull()?.let { t ->
                coverUrl = t.album?.coverBig ?: t.album?.coverMedium ?: event.artworkUrl
                albumTitle = t.album?.title
                deezerTrackId = t.id.takeIf { it > 0 }
            }
        } catch (_: Exception) {
            // artwork is best-effort
        }
    }

    val audio = ServiceLocator.audioPlayer
    val isActive = audio.currentlyPlayingId == event.id
    val context = LocalContext.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .verticalScroll(rememberScrollState()),
        ) {
            IconButton(onClick = onBack, modifier = Modifier.padding(4.dp)) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = RbTextPrimary,
                )
            }

            Spacer(Modifier.height(12.dp))

            // Artwork
            Box(
                modifier = Modifier
                    .padding(horizontal = 24.dp)
                    .size(200.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(RbAccent)
                    .align(Alignment.CenterHorizontally),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.MusicNote,
                    contentDescription = null,
                    tint = Color.White.copy(alpha = 0.9f),
                    modifier = Modifier.size(56.dp),
                )
                if (coverUrl != null) {
                    AsyncImage(
                        model = coverUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(RoundedCornerShape(18.dp)),
                    )
                }
            }

            Spacer(Modifier.height(24.dp))

            // Play snippet
            if (event.snippetUrl != null) {
                PlayBroadcastButton(
                    isLoading = isActive && audio.isLoading,
                    isPlaying = isActive && audio.isPlaying,
                    progress = if (isActive) audio.progress else 0f,
                    onClick = { audio.toggle(event.id, event.songTitle, event.station?.name) },
                    modifier = Modifier
                        .align(Alignment.CenterHorizontally)
                        .padding(horizontal = 24.dp),
                )
                Spacer(Modifier.height(24.dp))
            }

            // Song info
            Text(
                text = event.songTitle,
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                color = RbTextPrimary,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = event.artistName,
                style = MaterialTheme.typography.titleMedium,
                color = RbTextSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
            )
            albumTitle?.let {
                Spacer(Modifier.height(4.dp))
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall,
                    color = RbTextTertiary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp),
                )
            }

            Spacer(Modifier.height(28.dp))

            // Streaming links
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                horizontalArrangement = Arrangement.Center,
            ) {
                val isrc = event.isrc
                StreamingButton("Spotify", Icons.Filled.Headphones, Color(0xFF1DB954)) {
                    // ISRC field-filter resolves to the exact track; else artist + title.
                    val query = if (!isrc.isNullOrBlank()) "isrc:$isrc" else "${event.artistName} ${event.songTitle}"
                    openUrl(context, "https://open.spotify.com/search/${Uri.encode(query)}")
                }
                Spacer(Modifier.width(20.dp))
                deezerTrackId?.let { id ->
                    StreamingButton("Deezer", Icons.Filled.GraphicEq, Color(0xFFA238FF)) {
                        openUrl(context, "https://www.deezer.com/track/$id")
                    }
                    Spacer(Modifier.width(20.dp))
                }
                StreamingButton("YouTube", Icons.Filled.PlayArrow, Color(0xFFFF0000)) {
                    val q = Uri.encode("${event.artistName} ${event.songTitle}")
                    openUrl(context, "https://music.youtube.com/search?q=$q")
                }
            }

            Spacer(Modifier.height(28.dp))

            // Metadata cards
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                event.station?.name?.let { stationName ->
                    MetadataCard(
                        icon = Icons.Filled.GraphicEq,
                        title = "Station",
                        value = stationName,
                        subtitle = DateFormat.shortDateTime(event.startedAt),
                    )
                }
                val duration = DateFormat.durationLabel(event.startedAt, event.endedAt)
                if (duration.isNotEmpty()) {
                    MetadataCard(icon = Icons.Filled.PlayArrow, title = "Duration", value = duration)
                }
                if (!event.isrc.isNullOrBlank()) {
                    MetadataCard(icon = Icons.Filled.MusicNote, title = "ISRC", value = event.isrc, mono = true)
                }
                if (event.playCount > 0) {
                    MetadataCard(icon = Icons.Filled.MusicNote, title = "Play Count", value = event.playCount.toString())
                }
            }

            Spacer(Modifier.height(40.dp))
        }
    }
}

private fun openUrl(context: android.content.Context, url: String) {
    try {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
    } catch (_: Exception) {
    }
}

@Composable
private fun PlayBroadcastButton(
    isLoading: Boolean,
    isPlaying: Boolean,
    progress: Float,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Row(
            modifier = Modifier
                .clip(RoundedCornerShape(50))
                .background(Brush.linearGradient(listOf(RbGradientStart, RbGradientEnd)))
                .clickable(onClick = onClick)
                .padding(horizontal = 28.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            when {
                isLoading -> CircularProgressIndicator(
                    color = Color.White,
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(18.dp),
                )
                else -> Icon(
                    imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(20.dp),
                )
            }
            Spacer(Modifier.width(10.dp))
            Text(
                text = if (isPlaying) "Playing Broadcast" else "Play Broadcast Proof",
                style = MaterialTheme.typography.labelLarge,
                color = Color.White,
            )
        }
        if (isPlaying || progress > 0f) {
            Spacer(Modifier.height(10.dp))
            Box(
                modifier = Modifier
                    .width(220.dp)
                    .height(3.dp)
                    .clip(RoundedCornerShape(50))
                    .background(RbAccentDark.copy(alpha = 0.4f)),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(progress.coerceIn(0f, 1f))
                        .height(3.dp)
                        .clip(RoundedCornerShape(50))
                        .background(RbAccent),
                )
            }
        }
    }
}

@Composable
private fun StreamingButton(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    onClick: () -> Unit,
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(color.copy(alpha = 0.15f))
                .clickable(onClick = onClick),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = label, tint = color, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.height(6.dp))
        Text(label, style = MaterialTheme.typography.labelSmall, color = RbTextSecondary)
    }
}

private val monoValueStyle = TextStyle(fontFamily = IbmPlexMono, fontSize = 14.sp)

@Composable
private fun MetadataCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    value: String,
    subtitle: String? = null,
    mono: Boolean = false,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(music.onair.app.ui.theme.RbSurface)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(RbAccent.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = RbAccent, modifier = Modifier.size(18.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = RbTextTertiary,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                text = value,
                style = if (mono) monoValueStyle else MaterialTheme.typography.bodyLarge,
                color = RbTextPrimary,
            )
            subtitle?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall,
                    color = RbTextTertiary,
                )
            }
        }
    }
}
