package music.onair.app.ui.screens.label

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import music.onair.app.core.ServiceLocator
import music.onair.app.data.model.LabelArtistSong
import music.onair.app.ui.components.CenterEmpty
import music.onair.app.ui.components.CenterError
import music.onair.app.ui.components.CenterLoading
import music.onair.app.ui.components.GlassCard
import music.onair.app.ui.components.SectionHeader
import music.onair.app.ui.theme.IbmPlexMono
import music.onair.app.ui.theme.RbAccentLight
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbSuccess
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.theme.RbTextTertiary

private val monoSmall = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp)

/**
 * Read-only label artist detail: roster stats + the artist's songs
 * (GET /label/artists/:id/songs).
 */
@Composable
fun LabelArtistDetailScreen(
    artistId: Int,
    artistName: String,
    onBack: () -> Unit,
) {
    var songs by remember { mutableStateOf<List<LabelArtistSong>?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadTick by remember { mutableStateOf(0) }

    LaunchedEffect(artistId, reloadTick) {
        isLoading = true
        error = null
        try {
            songs = ServiceLocator.api.getLabelArtistSongs(artistId)
        } catch (e: Exception) {
            error = e.message ?: "Failed to load artist songs"
        } finally {
            isLoading = false
        }
    }

    BackHandler { onBack() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 24.dp),
    ) {
        IconButton(onClick = onBack, modifier = Modifier.padding(4.dp)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = RbTextPrimary)
        }

        Text(
            text = artistName.ifBlank { "Artist" },
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 4.dp),
        )

        val list = songs
        val monitored = list?.count { it.isMonitored } ?: 0
        if (list != null) {
            Text(
                text = "${list.size} songs · $monitored monitored",
                style = MaterialTheme.typography.bodyMedium,
                color = RbTextSecondary,
                modifier = Modifier.padding(horizontal = 20.dp),
            )
        }

        Spacer(Modifier.height(18.dp))
        SectionHeader("Songs", modifier = Modifier.padding(horizontal = 20.dp))
        Spacer(Modifier.height(8.dp))

        when {
            isLoading -> Box(Modifier.fillMaxWidth().height(260.dp)) { CenterLoading() }
            error != null -> Box(Modifier.fillMaxWidth().height(260.dp)) {
                CenterError(message = error ?: "Error", onRetry = { reloadTick++ })
            }
            list.isNullOrEmpty() -> Box(Modifier.fillMaxWidth().height(200.dp)) {
                CenterEmpty("No songs found for this artist yet.")
            }
            else -> Column(
                modifier = Modifier.padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                list.forEach { song -> SongRow(song) }
            }
        }
    }
}

@Composable
private fun SongRow(song: LabelArtistSong) {
    GlassCard(padding = 14.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = song.songTitle,
                    style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                    color = RbTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = if (song.isMonitored) {
                        "${song.totalPlays} plays · ${song.stationCount} stations"
                    } else {
                        "Not monitored"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = RbTextSecondary,
                )
                song.isrc?.takeIf { it.isNotBlank() }?.let { isrc ->
                    Spacer(Modifier.height(2.dp))
                    Text(text = isrc, style = monoSmall, color = RbTextTertiary)
                }
            }
            Spacer(Modifier.width(10.dp))
            Text(
                text = if (song.isMonitored) "MONITORED" else "OFF",
                style = MaterialTheme.typography.labelSmall,
                color = if (song.isMonitored) RbSuccess else RbTextTertiary,
            )
        }
    }
}
