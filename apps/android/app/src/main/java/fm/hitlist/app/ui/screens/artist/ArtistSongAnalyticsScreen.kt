package fm.hitlist.app.ui.screens.artist

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import fm.hitlist.app.core.ServiceLocator
import fm.hitlist.app.data.model.SongHourlyHeatmapResponse
import fm.hitlist.app.data.model.SongStationBreakdownItem
import fm.hitlist.app.ui.components.CenterError
import fm.hitlist.app.ui.components.CenterLoading
import fm.hitlist.app.ui.components.GlassCard
import fm.hitlist.app.ui.components.SectionHeader
import fm.hitlist.app.ui.theme.IbmPlexMono
import fm.hitlist.app.ui.theme.RbAccent
import fm.hitlist.app.ui.theme.RbBackground
import fm.hitlist.app.ui.theme.RbSurfaceLight
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextSecondary
import fm.hitlist.app.ui.theme.RbTextTertiary

private val mono = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp)
private val monoTiny = TextStyle(fontFamily = IbmPlexMono, fontSize = 8.sp)

private val DAY_LABELS = listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")

@Composable
fun ArtistSongAnalyticsScreen(
    songId: Int,
    songTitle: String,
    onBack: () -> Unit,
) {
    val vm: ArtistSongAnalyticsViewModel = viewModel(
        factory = viewModelFactory {
            initializer { ArtistSongAnalyticsViewModel(ServiceLocator.api, songId) }
        },
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 24.dp),
    ) {
        IconButton(onClick = onBack, modifier = Modifier.padding(4.dp)) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
                tint = RbTextPrimary,
            )
        }

        Text(
            text = songTitle,
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 12.dp),
        )

        val analytics = vm.analytics
        when {
            vm.isLoading && analytics == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) { CenterLoading() }
            vm.error != null && analytics == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterError(message = vm.error ?: "Error", onRetry = { vm.refresh() })
                }
            analytics != null -> {
                // --- Totals ---
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    StatBlock(
                        value = "${analytics.totalPlays}",
                        label = "TOTAL PLAYS",
                        modifier = Modifier.weight(1f),
                    )
                    StatBlock(
                        value = "${analytics.stationCount}",
                        label = "STATIONS",
                        modifier = Modifier.weight(1f),
                    )
                }

                // --- Daily plays bar chart ---
                val daily = analytics.dailyPlays
                if (daily.isNotEmpty()) {
                    Spacer(Modifier.height(24.dp))
                    SectionHeader("Daily plays", modifier = Modifier.padding(horizontal = 20.dp))
                    Spacer(Modifier.height(10.dp))
                    GlassCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp),
                    ) {
                        val recent = daily.takeLast(14)
                        DailyBars(
                            values = recent.map { it.count.toFloat() },
                            labels = recent.map { dayLabel(it.date) },
                        )
                    }
                }

                // --- Station breakdown ---
                val breakdown = vm.stationBreakdown
                if (breakdown.isNotEmpty()) {
                    Spacer(Modifier.height(24.dp))
                    SectionHeader("By station", modifier = Modifier.padding(horizontal = 20.dp))
                    Spacer(Modifier.height(10.dp))
                    GlassCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp),
                    ) {
                        val maxCount = (breakdown.maxOfOrNull { it.playCount } ?: 0).coerceAtLeast(1)
                        breakdown.forEachIndexed { index, item ->
                            if (index > 0) Spacer(Modifier.height(12.dp))
                            StationBreakdownRow(item = item, maxCount = maxCount)
                        }
                    }
                }

                // --- Hourly heatmap ---
                val heatmap = vm.heatmap
                if (heatmap != null && heatmap.matrix.isNotEmpty()) {
                    Spacer(Modifier.height(24.dp))
                    SectionHeader("Hourly heatmap", modifier = Modifier.padding(horizontal = 20.dp))
                    Spacer(Modifier.height(10.dp))
                    GlassCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp),
                    ) {
                        Heatmap(data = heatmap)
                    }
                }
            }
        }
    }
}

@Composable
private fun StatBlock(
    value: String,
    label: String,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier, padding = 14.dp) {
        Text(
            text = value,
            style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
            color = RbTextPrimary,
            maxLines = 1,
        )
        Spacer(Modifier.height(2.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = RbTextTertiary,
        )
    }
}

/** Local daily-plays bar chart (mirrors the shared BarChart styling but tuned for this screen). */
@Composable
private fun DailyBars(
    values: List<Float>,
    labels: List<String>,
    barsHeight: androidx.compose.ui.unit.Dp = 150.dp,
) {
    val max = (values.maxOrNull() ?: 0f).coerceAtLeast(1f)
    val topShape = RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp)

    Column(Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(barsHeight),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            values.forEach { value ->
                val fraction = (value / max).coerceIn(0.02f, 1f)
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight(fraction)
                        .clip(topShape)
                        .background(RbAccent),
                )
            }
        }
        if (labels.isNotEmpty()) {
            Spacer(Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                labels.forEach { label ->
                    Text(
                        text = label,
                        style = TextStyle(fontFamily = IbmPlexMono, fontSize = 9.sp),
                        color = RbTextTertiary,
                        textAlign = TextAlign.Center,
                        maxLines = 1,
                        overflow = TextOverflow.Clip,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun StationBreakdownRow(
    item: SongStationBreakdownItem,
    maxCount: Int,
) {
    Column(Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = item.stationName,
                style = MaterialTheme.typography.bodyMedium,
                color = RbTextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(10.dp))
            Text(
                text = "${item.playCount}",
                style = mono,
                color = RbTextSecondary,
            )
        }
        Spacer(Modifier.height(6.dp))
        val fraction = (item.playCount.toFloat() / maxCount.toFloat()).coerceIn(0.02f, 1f)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(RbSurfaceLight),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(fraction)
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(RbAccent),
            )
        }
    }
}

/**
 * 7x24 heatmap grid. Rows = days of week (0=Sunday), columns = hours (0-23).
 * Cell intensity = value / maxValue, rendered as RbAccent alpha.
 */
@Composable
private fun Heatmap(data: SongHourlyHeatmapResponse) {
    val maxValue = data.maxValue.coerceAtLeast(1)
    val cellShape = RoundedCornerShape(2.dp)

    Column(Modifier.fillMaxWidth()) {
        // Hour axis (show a few markers to keep it readable)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            // spacer aligning with the day label column
            Spacer(Modifier.width(28.dp))
            for (hour in 0 until 24) {
                Text(
                    text = if (hour % 6 == 0) "$hour" else "",
                    style = monoTiny,
                    color = RbTextTertiary,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Clip,
                    modifier = Modifier.weight(1f),
                )
            }
        }
        Spacer(Modifier.height(4.dp))

        data.matrix.forEachIndexed { dayIndex, hours ->
            if (dayIndex > 0) Spacer(Modifier.height(2.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = DAY_LABELS.getOrElse(dayIndex) { "" },
                    style = monoTiny,
                    color = RbTextTertiary,
                    maxLines = 1,
                    modifier = Modifier.width(28.dp),
                )
                for (hour in 0 until 24) {
                    val value = hours.getOrElse(hour) { 0 }
                    val intensity = (value.toFloat() / maxValue.toFloat()).coerceIn(0f, 1f)
                    val cellColor =
                        if (value <= 0) RbSurfaceLight.copy(alpha = 0.4f)
                        else RbAccent.copy(alpha = (0.15f + intensity * 0.85f).coerceIn(0.15f, 1f))
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(16.dp)
                            .clip(cellShape)
                            .background(cellColor),
                    )
                }
            }
        }
    }
}

private fun dayLabel(isoDate: String): String {
    // isoDate is "YYYY-MM-DD"; show the day-of-month for compactness.
    val parts = isoDate.split("-")
    return parts.getOrNull(2) ?: isoDate
}
