package music.onair.app.ui.screens.dashboard

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import music.onair.app.core.DateFormat
import music.onair.app.core.ServiceLocator
import music.onair.app.ui.components.BarChart
import music.onair.app.ui.components.CenterError
import music.onair.app.ui.components.CenterLoading
import music.onair.app.ui.components.PeriodPicker
import music.onair.app.ui.components.SectionHeader
import music.onair.app.ui.components.SummaryCard
import music.onair.app.ui.theme.IbmPlexMono
import music.onair.app.ui.theme.RbAccent
import music.onair.app.ui.theme.RbAccentDark
import music.onair.app.ui.theme.RbAccentLight
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbSurfaceLight
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.theme.RbTextTertiary

private fun formatCount(n: Int): String = "%,d".format(n)

private val monoSmall = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp)

@Composable
fun AdminDashboardScreen() {
    val vm: DashboardViewModel = viewModel(
        factory = viewModelFactory { initializer { DashboardViewModel(ServiceLocator.api) } },
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
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 12.dp),
        )

        PeriodPicker(
            selected = vm.period,
            onSelect = vm::selectPeriod,
            modifier = Modifier.padding(horizontal = 20.dp),
        )

        Spacer(Modifier.height(18.dp))

        val summary = vm.summary
        when {
            vm.isLoading && summary == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) { CenterLoading() }

            vm.error != null && summary == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterError(message = vm.error ?: "Error", onRetry = { vm.refresh() })
                }

            summary != null -> {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    SummaryCard(
                        value = formatCount(summary.totals.playCount),
                        label = "Plays",
                        icon = Icons.Filled.GraphicEq,
                        accent = RbAccent,
                        modifier = Modifier.weight(1f),
                    )
                    SummaryCard(
                        value = formatCount(summary.totals.uniqueSongs),
                        label = "Songs",
                        icon = Icons.Filled.LibraryMusic,
                        accent = RbAccentLight,
                        modifier = Modifier.weight(1f),
                    )
                    SummaryCard(
                        value = formatCount(summary.totals.uniqueArtists),
                        label = "Artists",
                        icon = Icons.Filled.Person,
                        accent = RbAccentDark,
                        modifier = Modifier.weight(1f),
                    )
                }

                Spacer(Modifier.height(24.dp))

                SectionHeader("Play count trend", modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(Modifier.height(10.dp))
                if (summary.buckets.isEmpty()) {
                    Box(Modifier.fillMaxWidth().height(120.dp), Alignment.Center) {
                        Text(
                            "No data for this period",
                            color = RbTextTertiary,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                } else {
                    val values = summary.buckets.map { it.playCount.toFloat() }
                    val maxVal = values.maxOrNull() ?: 0f
                    val lastIndex = values.lastIndex
                    val highlight = summary.buckets.indices
                        .filter { values[it] == maxVal || it == lastIndex }
                        .toSet()
                    val labels = sparseLabels(summary.buckets.map { DateFormat.dayMonth(it.bucket) })
                    BarChart(
                        values = values,
                        labels = labels,
                        highlight = highlight,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp),
                    )
                }

                Spacer(Modifier.height(28.dp))

                SectionHeader("Top stations", modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(Modifier.height(8.dp))
                if (vm.topStations.isEmpty()) {
                    Text(
                        "No stations",
                        color = RbTextTertiary,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(horizontal = 20.dp),
                    )
                } else {
                    val maxPlays = vm.topStations.maxOf { it.playCount }.coerceAtLeast(1)
                    vm.topStations.forEach { station ->
                        TopStationRow(
                            name = station.stationName,
                            plays = station.playCount,
                            maxPlays = maxPlays,
                            modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TopStationRow(
    name: String,
    plays: Int,
    maxPlays: Int,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = name,
                style = MaterialTheme.typography.bodyMedium,
                color = RbTextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(8.dp))
            Text(text = formatCount(plays), style = monoSmall, color = RbTextSecondary)
        }
        Spacer(Modifier.height(5.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(50))
                .background(RbSurfaceLight),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth((plays.toFloat() / maxPlays).coerceIn(0.02f, 1f))
                    .height(6.dp)
                    .clip(RoundedCornerShape(50))
                    .background(RbAccent),
            )
        }
    }
}

/** Keep at most ~8 axis labels; blank the rest to avoid overlap. */
private fun sparseLabels(labels: List<String>): List<String> {
    if (labels.size <= 8) return labels
    val step = (labels.size / 7).coerceAtLeast(1)
    return labels.mapIndexed { i, l -> if (i % step == 0) l else "" }
}
