package fm.hitlist.app.ui.screens.artist

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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import fm.hitlist.app.core.ServiceLocator
import fm.hitlist.app.ui.components.AirplayGauge
import fm.hitlist.app.ui.components.CenterError
import fm.hitlist.app.ui.components.CenterLoading
import fm.hitlist.app.ui.components.GlassCard
import fm.hitlist.app.ui.components.PeriodPicker
import fm.hitlist.app.ui.components.SectionHeader
import fm.hitlist.app.ui.components.StationBreakdown
import fm.hitlist.app.ui.theme.RbAccentLight
import fm.hitlist.app.ui.theme.RbBackground
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextSecondary
import fm.hitlist.app.ui.theme.RbTextTertiary
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.style.TextOverflow
import fm.hitlist.app.core.DateFormat
import fm.hitlist.app.ui.components.ReorderDialog

@Composable
fun ArtistDashboardScreen() {
    val vm: ArtistDashboardViewModel = viewModel(
        factory = viewModelFactory { initializer { ArtistDashboardViewModel(ServiceLocator.api) } },
    )

    var showArrange by remember { mutableStateOf(false) }

    if (showArrange) {
        ReorderDialog(
            title = "Arrange dashboard",
            items = vm.sectionOrder,
            label = { it.title },
            onDismiss = { showArrange = false },
            onConfirm = {
                vm.reorder(it)
                showArrange = false
            },
        )
    }

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
                .padding(start = 20.dp, end = 12.dp, top = 4.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Dashboard",
                style = MaterialTheme.typography.headlineLarge,
                color = RbTextPrimary,
                modifier = Modifier.weight(1f),
            )
            IconButton(onClick = { showArrange = true }) {
                Icon(
                    imageVector = Icons.Filled.SwapVert,
                    contentDescription = "Arrange dashboard",
                    tint = RbTextSecondary,
                )
            }
        }

        // Day / Week / Month. Totals, the top song and the station breakdown all
        // follow this selection; testers asked to be able to pick the reporting
        // window instead of being stuck on the week.
        PeriodPicker(
            selected = vm.period,
            onSelect = { vm.selectPeriod(it) },
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, bottom = 12.dp),
        )

        val data = vm.data
        when {
            vm.isLoading && data == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) { CenterLoading() }
            vm.error != null && data == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterError(message = vm.error ?: "Error", onRetry = { vm.refresh() })
                }
            data != null -> {
                // Rendered in the user's own order (long-press a row in Arrange to drag).
                vm.sectionOrder.forEach { section ->
                    when (section) {
                        DashboardSection.LATEST_PLAYS -> if (vm.latestPlays.isNotEmpty()) {
                            SectionHeader("Latest plays", modifier = Modifier.padding(horizontal = 20.dp))
                            Spacer(Modifier.height(10.dp))
                            GlassCard(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                            ) {
                                vm.latestPlays.forEachIndexed { index, event ->
                                    if (index > 0) Spacer(Modifier.height(8.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Column(Modifier.weight(1f)) {
                                            Text(
                                                text = event.songTitle,
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = RbTextPrimary,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis,
                                            )
                                            Text(
                                                text = event.artistName,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = RbTextSecondary,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis,
                                            )
                                        }
                                        Spacer(Modifier.width(10.dp))
                                        Text(
                                            text = DateFormat.shortDateTime(event.startedAt),
                                            style = MaterialTheme.typography.labelSmall,
                                            color = RbTextTertiary,
                                        )
                                    }
                                }
                            }
                            Spacer(Modifier.height(24.dp))
                        }

                        DashboardSection.AIRPLAY -> {
                            GlassCard(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                                padding = 20.dp,
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    AirplayGauge(value = data.totalPlaysWeek, caption = "this week")
                                    Spacer(Modifier.width(20.dp))
                                    Column {
                                        Text(
                                            text = "AIRPLAY",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = RbTextTertiary,
                                        )
                                        Spacer(Modifier.height(4.dp))
                                        Text(
                                            text = "${data.totalPlaysWeek}",
                                            style = MaterialTheme.typography.displayMedium.copy(fontWeight = FontWeight.Bold),
                                            color = RbTextPrimary,
                                        )
                                        Text(
                                            text = "${data.totalPlaysToday} plays today",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = RbTextSecondary,
                                        )
                                    }
                                }
                            }
                            Spacer(Modifier.height(24.dp))
                        }

                        DashboardSection.STATIONS -> if (data.stationBreakdown.isNotEmpty()) {
                            SectionHeader("Plays per station", modifier = Modifier.padding(horizontal = 20.dp))
                            Spacer(Modifier.height(10.dp))
                            GlassCard(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                            ) {
                                StationBreakdown(items = data.stationBreakdown)
                            }
                            Spacer(Modifier.height(24.dp))
                        }

                        DashboardSection.MOST_PLAYED -> data.mostPlayedSong?.let { song ->
                            SectionHeader("Most played", modifier = Modifier.padding(horizontal = 20.dp))
                            Spacer(Modifier.height(10.dp))
                            GlassCard(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                            ) {
                                Text(
                                    text = song.title,
                                    style = MaterialTheme.typography.titleMedium,
                                    color = RbTextPrimary,
                                )
                                Text(
                                    text = song.artist,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = RbTextSecondary,
                                )
                                Spacer(Modifier.height(6.dp))
                                Text(
                                    text = "${song.plays} plays",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = RbAccentLight,
                                )
                            }
                            Spacer(Modifier.height(24.dp))
                        }
                    }
                }
            }
        }
    }
}
