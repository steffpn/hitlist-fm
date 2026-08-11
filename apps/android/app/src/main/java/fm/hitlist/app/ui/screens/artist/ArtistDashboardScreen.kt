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

@Composable
fun ArtistDashboardScreen() {
    val vm: ArtistDashboardViewModel = viewModel(
        factory = viewModelFactory { initializer { ArtistDashboardViewModel(ServiceLocator.api) } },
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 24.dp),
    ) {
        Text(
            text = "Dashboard",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 12.dp),
        )

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
                GlassCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
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

                // Where this week's plays happened — the dashboard only ever showed
                // a combined total, so an artist could not tell which station was
                // actually carrying the track.
                if (data.stationBreakdown.isNotEmpty()) {
                    Spacer(Modifier.height(24.dp))
                    SectionHeader("Plays per station", modifier = Modifier.padding(horizontal = 20.dp))
                    Spacer(Modifier.height(10.dp))
                    GlassCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp),
                    ) {
                        StationBreakdown(items = data.stationBreakdown)
                    }
                }

                data.mostPlayedSong?.let { song ->
                    Spacer(Modifier.height(24.dp))
                    SectionHeader("Most played this week", modifier = Modifier.padding(horizontal = 20.dp))
                    Spacer(Modifier.height(10.dp))
                    GlassCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp),
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
                }
            }
        }
    }
}
