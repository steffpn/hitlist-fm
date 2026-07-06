package fm.hitlist.app.ui.screens.station

import androidx.compose.foundation.background
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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
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
import fm.hitlist.app.core.ServiceLocator
import fm.hitlist.app.data.model.OverRotatedSongItem
import fm.hitlist.app.data.model.RotationHourBucket
import fm.hitlist.app.ui.components.CenterEmpty
import fm.hitlist.app.ui.components.CenterError
import fm.hitlist.app.ui.components.CenterLoading
import fm.hitlist.app.ui.components.BarChart
import fm.hitlist.app.ui.components.GlassCard
import fm.hitlist.app.ui.components.PeriodPicker
import fm.hitlist.app.ui.components.SectionHeader
import fm.hitlist.app.ui.theme.IbmPlexMono
import fm.hitlist.app.ui.theme.RbAccentLight
import fm.hitlist.app.ui.theme.RbBackground
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextSecondary
import fm.hitlist.app.ui.theme.RbTextTertiary
import fm.hitlist.app.ui.theme.RbWarning

private val monoLarge = TextStyle(fontFamily = IbmPlexMono, fontSize = 40.sp, fontWeight = FontWeight.Bold)
private val monoSmall = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp)

@Composable
fun RotationAnalysisScreen() {
    val vm: RotationAnalysisViewModel = viewModel(
        factory = viewModelFactory { initializer { RotationAnalysisViewModel(ServiceLocator.api) } },
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
            text = "Rotation Analysis",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 4.dp),
        )
        Text(
            text = "How often your station repeats songs",
            style = MaterialTheme.typography.bodyMedium,
            color = RbTextSecondary,
            modifier = Modifier.padding(horizontal = 20.dp),
        )

        Spacer(Modifier.height(12.dp))
        PeriodPicker(vm.period, vm::selectPeriod, modifier = Modifier.padding(horizontal = 20.dp))
        Spacer(Modifier.height(18.dp))

        val d = vm.data
        when {
            vm.isLoading && d == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) { CenterLoading() }
            vm.error != null && d == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterError(message = vm.error ?: "Error", onRetry = { vm.refresh() })
                }
            d != null -> {
                GlassCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
                    Text(
                        text = "Average rotation",
                        style = MaterialTheme.typography.bodyMedium,
                        color = RbTextSecondary,
                    )
                    Spacer(Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(
                            text = "%.2f".format(d.averageRotation),
                            style = monoLarge,
                            color = RbTextPrimary,
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = "plays / song",
                            style = MaterialTheme.typography.bodyMedium,
                            color = RbTextTertiary,
                            modifier = Modifier.padding(bottom = 8.dp),
                        )
                    }
                }

                Spacer(Modifier.height(24.dp))
                SectionHeader("Unique songs by hour", modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(Modifier.height(10.dp))
                HourlyChart(d.uniqueSongsPerHour)

                Spacer(Modifier.height(28.dp))
                SectionHeader("Over-rotated songs", modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(Modifier.height(6.dp))
                if (d.overRotatedSongs.isEmpty()) {
                    Box(Modifier.fillMaxWidth().height(160.dp)) {
                        CenterEmpty(message = "No over-rotated songs in this period")
                    }
                } else {
                    d.overRotatedSongs.forEach { song -> OverRotatedRow(song) }
                }
            }
        }
    }
}

@Composable
private fun HourlyChart(buckets: List<RotationHourBucket>) {
    // Build a full 0..23 series so gaps render as empty slots.
    val byHour = buckets.associateBy { it.hour }
    val values = (0..23).map { (byHour[it]?.count ?: 0).toFloat() }
    // Label every 6th hour to avoid clutter.
    val labels = (0..23).map { if (it % 6 == 0) it.toString() else "" }

    if (values.all { it == 0f }) {
        Box(Modifier.fillMaxWidth().height(160.dp).padding(horizontal = 20.dp)) {
            CenterEmpty(message = "No airplay in this period")
        }
        return
    }

    BarChart(
        values = values,
        labels = labels,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
    )
}

@Composable
private fun OverRotatedRow(song: OverRotatedSongItem) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Filled.Warning,
            contentDescription = "Over-rotated",
            tint = RbWarning,
            modifier = Modifier.size(20.dp),
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = song.songTitle,
                style = MaterialTheme.typography.bodyLarge,
                color = RbTextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = song.artistName,
                style = MaterialTheme.typography.bodySmall,
                color = RbTextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Spacer(Modifier.width(8.dp))
        Column(horizontalAlignment = Alignment.End) {
            Text("${song.playCount} plays", style = monoSmall, color = RbAccentLight)
            Text("max ~${song.expectedMax}", style = monoSmall, color = RbTextTertiary)
        }
    }
}
