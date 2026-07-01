package music.onair.app.ui.screens.station

import androidx.activity.compose.BackHandler
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import music.onair.app.core.DateFormat
import music.onair.app.core.ServiceLocator
import music.onair.app.data.model.CompetitorComparisonItem
import music.onair.app.data.model.CompetitorDetailTopSong
import music.onair.app.data.model.CompetitorRecentDetection
import music.onair.app.data.model.CompetitorSummaryItem
import music.onair.app.ui.components.CenterEmpty
import music.onair.app.ui.components.CenterError
import music.onair.app.ui.components.CenterLoading
import music.onair.app.ui.components.GlassCard
import music.onair.app.ui.components.PeriodPicker
import music.onair.app.ui.components.SectionHeader
import music.onair.app.ui.theme.IbmPlexMono
import music.onair.app.ui.theme.RbAccentLight
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbLive
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.theme.RbTextTertiary
import music.onair.app.ui.theme.RbWarm

private val monoSmall = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp)
private val monoValue = TextStyle(fontFamily = IbmPlexMono, fontSize = 22.sp, fontWeight = FontWeight.Bold)

@Composable
fun CompetitorsScreen() {
    val vm: CompetitorsViewModel = viewModel(
        factory = viewModelFactory { initializer { CompetitorsViewModel(ServiceLocator.api) } },
    )

    // Detail sub-screen (opened by tapping a competitor). Back returns to the list.
    if (vm.selectedStationId != null) {
        BackHandler { vm.closeDetail() }
        CompetitorDetailScreen(vm)
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 24.dp),
    ) {
        Text(
            text = "Competitors",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 4.dp),
        )
        Text(
            text = "Airplay from the stations you watch",
            style = MaterialTheme.typography.bodyMedium,
            color = RbTextSecondary,
            modifier = Modifier.padding(horizontal = 20.dp),
        )

        Spacer(Modifier.height(12.dp))
        PeriodPicker(vm.period, vm::selectPeriod, modifier = Modifier.padding(horizontal = 20.dp))
        Spacer(Modifier.height(18.dp))

        val list = vm.summary
        when {
            vm.isLoading && list == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) { CenterLoading() }
            vm.error != null && list == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterError(message = vm.error ?: "Error", onRetry = { vm.refresh() })
                }
            list != null && list.isEmpty() ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterEmpty(message = "No competitors yet")
                }
            list != null -> {
                Column(
                    modifier = Modifier.padding(horizontal = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    list.forEach { item ->
                        CompetitorCard(item, onClick = { vm.openDetail(item.stationId, item.stationName) })
                    }
                }
            }
        }
    }
}

@Composable
private fun CompetitorCard(item: CompetitorSummaryItem, onClick: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick), padding = 14.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = item.stationName,
                    style = MaterialTheme.typography.titleMedium,
                    color = RbTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                val top = item.topSong
                Text(
                    text = if (top != null) "Top: ${top.title} — ${top.artist}" else "No airplay in this period",
                    style = MaterialTheme.typography.bodySmall,
                    color = RbTextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text(text = "${item.playCount}", style = monoValue, color = RbAccentLight)
                Text(text = "PLAYS", style = MaterialTheme.typography.labelSmall, color = RbTextTertiary)
            }
            Spacer(Modifier.width(8.dp))
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = RbTextTertiary,
            )
        }
    }
}

@Composable
private fun CompetitorDetailScreen(vm: CompetitorsViewModel) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 24.dp),
    ) {
        Text(
            text = vm.selectedStationName ?: "Competitor",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 4.dp),
        )

        Spacer(Modifier.height(12.dp))
        PeriodPicker(vm.period, vm::selectPeriod, modifier = Modifier.padding(horizontal = 20.dp))
        Spacer(Modifier.height(18.dp))

        val d = vm.detail
        when {
            vm.detailLoading && d == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) { CenterLoading() }
            vm.detailError != null && d == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterError(message = vm.detailError ?: "Error", onRetry = { vm.retryDetail() })
                }
            d != null -> {
                SectionHeader("Top songs", modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(Modifier.height(6.dp))
                if (d.topSongs.isEmpty()) {
                    Box(Modifier.fillMaxWidth().height(120.dp)) {
                        CenterEmpty(message = "No top songs in this period")
                    }
                } else {
                    Column(
                        modifier = Modifier.padding(horizontal = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        d.topSongs.forEach { song -> TopSongRow(song) }
                    }
                }

                Spacer(Modifier.height(28.dp))
                SectionHeader("Vs your station", modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(Modifier.height(6.dp))
                if (d.comparison.isEmpty()) {
                    Box(Modifier.fillMaxWidth().height(120.dp)) {
                        CenterEmpty(message = "No overlapping songs in this period")
                    }
                } else {
                    Column(
                        modifier = Modifier.padding(horizontal = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        d.comparison.forEach { row -> ComparisonRow(row) }
                    }
                }

                Spacer(Modifier.height(28.dp))
                SectionHeader("Recent detections", modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(Modifier.height(6.dp))
                if (d.recentDetections.isEmpty()) {
                    Box(Modifier.fillMaxWidth().height(120.dp)) {
                        CenterEmpty(message = "No recent detections")
                    }
                } else {
                    Column(
                        modifier = Modifier.padding(horizontal = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        d.recentDetections.forEach { det -> RecentDetectionRow(det) }
                    }
                }
            }
        }
    }
}

@Composable
private fun TopSongRow(song: CompetitorDetailTopSong) {
    GlassCard(padding = 14.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = song.title,
                    style = MaterialTheme.typography.bodyLarge,
                    color = RbTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = song.artist,
                    style = MaterialTheme.typography.bodySmall,
                    color = RbTextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(Modifier.width(8.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text(text = "${song.playCount}", style = monoSmall, color = RbAccentLight)
                Text(text = "plays", style = monoSmall, color = RbTextTertiary)
            }
        }
    }
}

@Composable
private fun ComparisonRow(row: CompetitorComparisonItem) {
    GlassCard(padding = 14.dp) {
        Column {
            Text(
                text = row.songTitle,
                style = MaterialTheme.typography.bodyLarge,
                color = RbTextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = row.artistName,
                style = MaterialTheme.typography.bodySmall,
                color = RbTextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(text = "${row.theirPlays}", style = monoSmall, color = RbWarm)
                    Text(text = "THEM", style = MaterialTheme.typography.labelSmall, color = RbTextTertiary)
                }
                Column(Modifier.weight(1f), horizontalAlignment = Alignment.End) {
                    Text(text = "${row.yourPlays}", style = monoSmall, color = RbLive)
                    Text(text = "YOU", style = MaterialTheme.typography.labelSmall, color = RbTextTertiary)
                }
            }
        }
    }
}

@Composable
private fun RecentDetectionRow(det: CompetitorRecentDetection) {
    GlassCard(padding = 14.dp) {
        Column {
            Text(
                text = det.songTitle,
                style = MaterialTheme.typography.bodyLarge,
                color = RbTextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = det.artistName,
                style = MaterialTheme.typography.bodySmall,
                color = RbTextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = DateFormat.shortDateTime(det.startedAt),
                style = monoSmall,
                color = RbTextTertiary,
            )
        }
    }
}
