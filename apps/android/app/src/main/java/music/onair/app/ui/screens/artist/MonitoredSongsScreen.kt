package music.onair.app.ui.screens.artist

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import music.onair.app.core.ServiceLocator
import music.onair.app.data.model.MonitoredSong
import music.onair.app.ui.components.CenterEmpty
import music.onair.app.ui.components.CenterError
import music.onair.app.ui.components.CenterLoading
import music.onair.app.ui.components.GlassCard
import music.onair.app.ui.components.TrendBadge
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary

@Composable
fun MonitoredSongsScreen() {
    val vm: MonitoredSongsViewModel = viewModel(
        factory = viewModelFactory { initializer { MonitoredSongsViewModel(ServiceLocator.api) } },
    )

    var analyticsSong by remember { mutableStateOf<MonitoredSong?>(null) }
    val selected = analyticsSong
    if (selected != null) {
        ArtistSongAnalyticsScreen(
            songId = selected.id,
            songTitle = selected.songTitle,
            onBack = { analyticsSong = null },
        )
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .statusBarsPadding(),
    ) {
        Text(
            text = "My Songs",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 8.dp),
        )

        Box(Modifier.weight(1f)) {
            when {
                vm.isLoading && vm.songs.isEmpty() -> CenterLoading()
                vm.error != null && vm.songs.isEmpty() ->
                    CenterError(message = vm.error ?: "Error", onRetry = { vm.refresh() })
                vm.songs.isEmpty() -> CenterEmpty("No monitored songs yet.")
                else -> LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(vm.songs, key = { it.id }) { song ->
                        SongCard(song, onClick = { analyticsSong = song })
                    }
                }
            }
        }
    }
}

@Composable
private fun SongCard(song: MonitoredSong, onClick: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = song.songTitle,
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = RbTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = "${song.totalPlays} plays · ${song.stationCount} stations",
                    style = MaterialTheme.typography.bodySmall,
                    color = RbTextSecondary,
                )
            }
            song.trend?.let {
                Spacer(Modifier.width(10.dp))
                TrendBadge(direction = it.direction, percentChange = it.percentChange)
            }
        }
    }
}
