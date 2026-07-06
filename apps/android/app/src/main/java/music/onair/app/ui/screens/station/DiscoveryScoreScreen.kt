package music.onair.app.ui.screens.station

import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.NewReleases
import androidx.compose.material.icons.filled.QueueMusic
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import music.onair.app.core.ServiceLocator
import music.onair.app.data.model.DiscoveryScoreResponse
import music.onair.app.ui.components.CenterError
import music.onair.app.ui.components.CenterLoading
import music.onair.app.ui.components.GlassCard
import music.onair.app.ui.components.PeriodPicker
import music.onair.app.ui.components.SectionHeader
import music.onair.app.ui.components.SummaryCard
import music.onair.app.ui.theme.IbmPlexMono
import music.onair.app.ui.theme.RbAccent
import music.onair.app.ui.theme.RbAccentDark
import music.onair.app.ui.theme.RbAccentLight
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbGradientEnd
import music.onair.app.ui.theme.RbGradientStart
import music.onair.app.ui.theme.RbSurfaceLight
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.theme.RbTextTertiary

private fun fmt(n: Int) = "%,d".format(n)
private val monoLabel = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp)

@Composable
fun DiscoveryScoreScreen() {
    val vm: DiscoveryScoreViewModel = viewModel(
        factory = viewModelFactory { initializer { DiscoveryScoreViewModel(ServiceLocator.api) } },
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
            text = "Discovery Score",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 4.dp),
        )
        Text(
            text = "How much of your recent airplay is fresh, newly-emerging music.",
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
                Box(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularScore(score = d.score)
                }

                Spacer(Modifier.height(24.dp))
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    SummaryCard(fmt(d.newSongsCount), "New songs", Icons.Filled.NewReleases, Modifier.weight(1f), RbAccentLight)
                    SummaryCard(fmt(d.totalSongsCount), "Total songs", Icons.Filled.LibraryMusic, Modifier.weight(1f), RbAccent)
                    SummaryCard(fmt(d.newSongsPlays), "New plays", Icons.Filled.QueueMusic, Modifier.weight(1f), RbAccentDark)
                }

                Spacer(Modifier.height(24.dp))
                SectionHeader("What this means", modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(Modifier.height(8.dp))
                GlassCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
                    Text(
                        text = interpretation(d),
                        style = MaterialTheme.typography.bodyMedium,
                        color = RbTextSecondary,
                    )
                    Spacer(Modifier.height(10.dp))
                    Text(
                        text = "${fmt(d.newSongsPlays)} of ${fmt(d.totalPlays)} plays were new songs",
                        style = monoLabel,
                        color = RbTextTertiary,
                    )
                }
            }
        }
    }
}

/** Interpretation copy keyed off the 0-100 discovery score. */
private fun interpretation(d: DiscoveryScoreResponse): String = when {
    d.totalPlays == 0 -> "No airplay recorded in this period yet."
    d.score >= 40.0 -> "Your rotation leans heavily into new music — a strong discovery profile that gives emerging artists real exposure."
    d.score >= 20.0 -> "A healthy share of your airplay comes from newly-emerging songs, balancing fresh discoveries with established tracks."
    d.score >= 5.0 -> "Most of your airplay is established catalogue, with a modest slice of newer songs breaking through."
    else -> "Your rotation is almost entirely established catalogue, with very little newly-emerging music this period."
}

/**
 * Circular score ring: a track arc plus a gradient progress arc sweeping
 * (score/100) * 270 degrees, with the score number centered.
 * Mirrors the Canvas/drawArc approach used by AirplayGauge.
 */
@Composable
private fun CircularScore(
    score: Double,
    modifier: Modifier = Modifier,
    diameter: Dp = 200.dp,
) {
    val clamped = score.coerceIn(0.0, 100.0)
    val progressSweep = (clamped / 100.0 * 270.0).toFloat()

    Box(modifier = modifier.size(diameter), contentAlignment = Alignment.Center) {
        Canvas(modifier = Modifier.size(diameter)) {
            val strokeWidth = 18.dp.toPx()
            val dim = size.minDimension - strokeWidth
            val topLeft = Offset(strokeWidth / 2f, strokeWidth / 2f)
            val arcSize = Size(dim, dim)
            drawArc(
                color = RbSurfaceLight,
                startAngle = 135f,
                sweepAngle = 270f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round),
            )
            if (progressSweep > 0f) {
                drawArc(
                    brush = Brush.linearGradient(listOf(RbGradientStart, RbGradientEnd)),
                    startAngle = 135f,
                    sweepAngle = progressSweep,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Round),
                )
            }
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "%.0f".format(clamped),
                style = MaterialTheme.typography.displayMedium.copy(fontWeight = FontWeight.Bold),
                color = RbTextPrimary,
                textAlign = TextAlign.Center,
            )
            Text(
                text = "DISCOVERY SCORE",
                style = MaterialTheme.typography.labelSmall,
                color = RbTextTertiary,
                textAlign = TextAlign.Center,
            )
        }
    }
}
