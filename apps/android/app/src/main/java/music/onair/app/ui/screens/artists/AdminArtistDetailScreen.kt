package music.onair.app.ui.screens.artists

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
import music.onair.app.core.DateFormat
import music.onair.app.core.ServiceLocator
import music.onair.app.data.model.AirplayEvent
import music.onair.app.ui.components.CenterEmpty
import music.onair.app.ui.components.CenterError
import music.onair.app.ui.components.CenterLoading
import music.onair.app.ui.components.GlassCard
import music.onair.app.ui.components.SectionHeader
import music.onair.app.ui.theme.IbmPlexMono
import music.onair.app.ui.theme.RbAccentLight
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.theme.RbTextTertiary

private val monoSmall = TextStyle(fontFamily = IbmPlexMono, fontSize = 11.sp)
private val monoStat = TextStyle(fontFamily = IbmPlexMono, fontSize = 18.sp, fontWeight = FontWeight.Bold)

/**
 * Read-only admin artist detail: summary stats (from the tapped summary row)
 * plus recent detections filtered by artist name (GET /airplay-events?q=).
 */
@Composable
fun AdminArtistDetailScreen(
    artistName: String,
    playCount: Int,
    songCount: Int,
    stationCount: Int,
    onBack: () -> Unit,
) {
    var events by remember { mutableStateOf<List<AirplayEvent>?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadTick by remember { mutableStateOf(0) }

    LaunchedEffect(artistName, reloadTick) {
        isLoading = true
        error = null
        try {
            val res = ServiceLocator.api.getAirplayEvents(limit = 30, query = artistName)
            events = res.data.filter { it.artistName.equals(artistName, ignoreCase = true) }
        } catch (e: Exception) {
            error = e.message ?: "Failed to load detections"
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
            text = artistName,
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 12.dp),
        )

        GlassCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
            Row(Modifier.fillMaxWidth()) {
                Stat("PLAYS", playCount, Modifier.weight(1f))
                Stat("SONGS", songCount, Modifier.weight(1f))
                Stat("STATIONS", stationCount, Modifier.weight(1f))
            }
        }

        Spacer(Modifier.height(20.dp))
        SectionHeader("Recent detections", modifier = Modifier.padding(horizontal = 20.dp))
        Spacer(Modifier.height(8.dp))

        val list = events
        when {
            isLoading -> Box(Modifier.fillMaxWidth().height(240.dp)) { CenterLoading() }
            error != null -> Box(Modifier.fillMaxWidth().height(240.dp)) {
                CenterError(message = error ?: "Error", onRetry = { reloadTick++ })
            }
            list.isNullOrEmpty() -> Box(Modifier.fillMaxWidth().height(160.dp)) {
                CenterEmpty("No recent detections for this artist.")
            }
            else -> Column(
                modifier = Modifier.padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                list.forEach { event -> DetectionCard(event) }
            }
        }
    }
}

@Composable
private fun Stat(label: String, value: Int, modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = "$value", style = monoStat, color = RbAccentLight)
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = RbTextTertiary)
    }
}

@Composable
private fun DetectionCard(event: AirplayEvent) {
    GlassCard(padding = 14.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = event.songTitle,
                    style = MaterialTheme.typography.bodyLarge,
                    color = RbTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                event.station?.name?.let { stationName ->
                    Text(
                        text = stationName,
                        style = MaterialTheme.typography.labelSmall,
                        color = RbTextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            Spacer(Modifier.width(8.dp))
            Text(
                text = DateFormat.shortDateTime(event.startedAt),
                style = monoSmall,
                color = RbTextTertiary,
            )
        }
    }
}
