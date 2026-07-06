package fm.hitlist.app.ui.screens.station

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
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
import fm.hitlist.app.core.DateFormat
import fm.hitlist.app.core.ServiceLocator
import fm.hitlist.app.data.model.CompetitorComparisonItem
import fm.hitlist.app.data.model.CompetitorDetailTopSong
import fm.hitlist.app.data.model.CompetitorRecentDetection
import fm.hitlist.app.data.model.CompetitorSummaryItem
import fm.hitlist.app.ui.components.CenterEmpty
import fm.hitlist.app.ui.components.CenterError
import fm.hitlist.app.ui.components.CenterLoading
import fm.hitlist.app.ui.components.GlassCard
import fm.hitlist.app.ui.components.PeriodPicker
import fm.hitlist.app.ui.components.SectionHeader
import fm.hitlist.app.ui.theme.IbmPlexMono
import fm.hitlist.app.ui.theme.RbAccent
import fm.hitlist.app.ui.theme.RbAccentLight
import fm.hitlist.app.ui.theme.RbBackground
import fm.hitlist.app.ui.theme.RbError
import fm.hitlist.app.ui.theme.RbSuccess
import fm.hitlist.app.ui.theme.RbSurface
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextSecondary
import fm.hitlist.app.ui.theme.RbTextTertiary
import fm.hitlist.app.ui.theme.RbWarm

private val monoSmall = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp)
private val monoValue = TextStyle(fontFamily = IbmPlexMono, fontSize = 22.sp, fontWeight = FontWeight.Bold)

@OptIn(ExperimentalMaterial3Api::class)
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

    var showAddSheet by rememberSaveable { mutableStateOf(false) }
    var pendingRemoval by remember { mutableStateOf<CompetitorSummaryItem?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 24.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 20.dp, end = 12.dp, top = 4.dp, bottom = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Competitors",
                style = MaterialTheme.typography.headlineLarge,
                color = RbTextPrimary,
                modifier = Modifier.weight(1f),
            )
            IconButton(
                onClick = {
                    vm.loadPickerStations()
                    showAddSheet = true
                },
            ) {
                Icon(Icons.Filled.Add, contentDescription = "Add competitor", tint = RbAccent)
            }
        }
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
                Box(Modifier.fillMaxWidth().height(240.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "No competitors yet",
                            style = MaterialTheme.typography.titleMedium,
                            color = RbTextPrimary,
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = "Watch a station to compare its airplay with yours.",
                            style = MaterialTheme.typography.bodySmall,
                            color = RbTextSecondary,
                        )
                        Spacer(Modifier.height(16.dp))
                        TextButton(onClick = {
                            vm.loadPickerStations()
                            showAddSheet = true
                        }) {
                            Text("Add a competitor", color = RbAccent)
                        }
                    }
                }
            list != null -> {
                Column(
                    modifier = Modifier.padding(horizontal = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    list.forEach { item ->
                        CompetitorCard(
                            item = item,
                            onClick = { vm.openDetail(item.stationId, item.stationName) },
                            onLongPress = { pendingRemoval = item },
                        )
                    }
                }
                Spacer(Modifier.height(10.dp))
                Text(
                    text = "Tip: long-press a competitor to remove it.",
                    style = MaterialTheme.typography.labelSmall,
                    color = RbTextTertiary,
                    modifier = Modifier.padding(horizontal = 20.dp),
                )
            }
        }
    }

    if (showAddSheet) {
        ModalBottomSheet(
            onDismissRequest = { showAddSheet = false },
            containerColor = RbSurface,
        ) {
            Text(
                text = "Add a competitor",
                style = MaterialTheme.typography.titleLarge,
                color = RbTextPrimary,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            )
            vm.pickerError?.let { err ->
                Text(
                    text = err,
                    style = MaterialTheme.typography.bodySmall,
                    color = RbError,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
                )
            }
            when {
                vm.pickerLoading -> Box(
                    Modifier.fillMaxWidth().height(160.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = RbAccent, strokeWidth = 2.dp, modifier = Modifier.size(24.dp))
                }
                vm.pickerStations.isEmpty() -> Box(
                    Modifier.fillMaxWidth().height(160.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "No more stations available to watch.",
                        style = MaterialTheme.typography.bodySmall,
                        color = RbTextTertiary,
                    )
                }
                else -> LazyColumn(contentPadding = PaddingValues(bottom = 32.dp)) {
                    items(vm.pickerStations, key = { it.id }) { station ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable(enabled = !vm.isMutating) {
                                    vm.addCompetitor(station.id) { showAddSheet = false }
                                }
                                .padding(horizontal = 20.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text(
                                    text = station.name,
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = RbTextPrimary,
                                )
                                station.country?.let {
                                    Text(it, style = MaterialTheme.typography.labelSmall, color = RbTextTertiary)
                                }
                            }
                            Icon(
                                Icons.Filled.Add,
                                contentDescription = "Watch ${station.name}",
                                tint = RbAccent,
                                modifier = Modifier.size(20.dp),
                            )
                        }
                    }
                }
            }
        }
    }

    pendingRemoval?.let { item ->
        AlertDialog(
            onDismissRequest = { pendingRemoval = null },
            containerColor = RbSurface,
            title = { Text("Remove competitor?", color = RbTextPrimary) },
            text = {
                Text(
                    "\"${item.stationName}\" will be removed from your watch list.",
                    color = RbTextSecondary,
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        vm.removeCompetitor(item.stationId)
                        pendingRemoval = null
                    },
                ) { Text("Remove", color = RbError) }
            },
            dismissButton = {
                TextButton(onClick = { pendingRemoval = null }) {
                    Text("Cancel", color = RbTextTertiary)
                }
            },
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun CompetitorCard(
    item: CompetitorSummaryItem,
    onClick: () -> Unit,
    onLongPress: () -> Unit,
) {
    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(onClick = onClick, onLongClick = onLongPress),
        padding = 14.dp,
    ) {
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
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 4.dp),
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
                    Text(text = "${row.yourPlays}", style = monoSmall, color = RbSuccess)
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
