package music.onair.app.ui.screens.label

import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import music.onair.app.core.ServiceLocator
import music.onair.app.data.model.LabelArtistItem
import music.onair.app.data.model.LabelComparisonArtist
import music.onair.app.ui.components.CenterEmpty
import music.onair.app.ui.components.CenterError
import music.onair.app.ui.components.CenterLoading
import music.onair.app.ui.components.GlassCard
import music.onair.app.ui.components.GradientButton
import music.onair.app.ui.components.PeriodPicker
import music.onair.app.ui.components.SectionHeader
import music.onair.app.ui.theme.IbmPlexMono
import music.onair.app.ui.theme.RbAccent
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbLive
import music.onair.app.ui.theme.RbSurfaceHighlight
import music.onair.app.ui.theme.RbSurfaceLight
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.theme.RbTextTertiary
import music.onair.app.ui.theme.RbWarm

private fun fmtInt(n: Int) = "%,d".format(n)
private val monoSmall = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp)

// Up to 3 distinct series colors, matching the legend order.
private val seriesColors = listOf(RbAccent, RbWarm, RbLive)

@Composable
fun LabelComparisonScreen() {
    val vm: LabelComparisonViewModel = viewModel(
        factory = viewModelFactory { initializer { LabelComparisonViewModel(ServiceLocator.api) } },
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
            text = "Artist Comparison",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 4.dp),
        )
        Text(
            text = "Compare daily plays across up to 3 of your artists",
            style = MaterialTheme.typography.bodyMedium,
            color = RbTextSecondary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, bottom = 12.dp),
        )

        val artists = vm.artists
        when {
            vm.isLoadingArtists && artists == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) { CenterLoading() }

            vm.artistsError != null && artists == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterError(message = vm.artistsError ?: "Error", onRetry = { vm.refresh() })
                }

            artists != null && artists.isEmpty() ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterEmpty(message = "No artists to compare yet")
                }

            artists != null -> {
                SelectionSection(
                    artists = artists,
                    selectedIds = vm.selectedIds,
                    maxSelection = vm.maxSelection,
                    onToggle = { vm.toggleArtist(it) },
                )

                Spacer(Modifier.height(16.dp))

                GradientButton(
                    text = if (vm.selectedIds.isEmpty()) "Select artists to compare" else "Compare",
                    onClick = { vm.compare() },
                    enabled = vm.selectedIds.isNotEmpty(),
                    loading = vm.isComparing,
                    modifier = Modifier.padding(horizontal = 20.dp),
                )

                Spacer(Modifier.height(20.dp))

                val comparison = vm.comparison
                when {
                    vm.comparisonError != null ->
                        Box(Modifier.fillMaxWidth().height(200.dp)) {
                            CenterError(
                                message = vm.comparisonError ?: "Error",
                                onRetry = { vm.compare() },
                            )
                        }

                    comparison != null && comparison.artists.isNotEmpty() -> {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            SectionHeader(text = "Daily Plays")
                            PeriodPicker(
                                selected = vm.period,
                                onSelect = { vm.onPeriodChange(it) },
                            )
                        }
                        Spacer(Modifier.height(12.dp))
                        ComparisonResult(artists = comparison.artists)
                    }
                }
            }
        }
    }
}

@Composable
private fun SelectionSection(
    artists: List<LabelArtistItem>,
    selectedIds: Set<Int>,
    maxSelection: Int,
    onToggle: (Int) -> Unit,
) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            SectionHeader(text = "Select Artists")
            Text(
                text = "${selectedIds.size} / $maxSelection",
                style = monoSmall,
                color = RbTextTertiary,
            )
        }
        Spacer(Modifier.height(8.dp))

        GlassCard(modifier = Modifier.padding(horizontal = 20.dp)) {
            artists.forEachIndexed { index, artist ->
                val checked = selectedIds.contains(artist.id)
                val atLimit = !checked && selectedIds.size >= maxSelection
                ArtistCheckboxRow(
                    artist = artist,
                    checked = checked,
                    enabled = !atLimit,
                    onToggle = { onToggle(artist.id) },
                )
                if (index != artists.lastIndex) {
                    Spacer(Modifier.height(10.dp))
                }
            }
        }
    }
}

@Composable
private fun ArtistCheckboxRow(
    artist: LabelArtistItem,
    checked: Boolean,
    enabled: Boolean,
    onToggle: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(enabled = enabled || checked, onClick = onToggle)
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Checkbox indicator.
        Box(
            modifier = Modifier
                .size(22.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(if (checked) RbAccent else RbSurfaceLight),
            contentAlignment = Alignment.Center,
        ) {
            if (checked) {
                Text(
                    text = "✓",
                    style = MaterialTheme.typography.labelLarge,
                    color = Color.White,
                )
            }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = artist.artistName,
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                color = if (enabled || checked) RbTextPrimary else RbTextTertiary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = "${fmtInt(artist.songCount)} songs · ${fmtInt(artist.totalPlays)} plays",
                style = MaterialTheme.typography.labelSmall,
                color = RbTextTertiary,
            )
        }
    }
}

@Composable
private fun ComparisonResult(artists: List<LabelComparisonArtist>) {
    // Legend: one colored square per artist.
    GlassCard(modifier = Modifier.padding(horizontal = 20.dp)) {
        artists.forEachIndexed { index, artist ->
            val color = seriesColors[index % seriesColors.size]
            val total = artist.dailyPlays.sumOf { it.count }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(color),
                )
                Spacer(Modifier.width(10.dp))
                Text(
                    text = artist.artistName,
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = RbTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Spacer(Modifier.width(12.dp))
                Text(
                    text = "${fmtInt(total)} plays",
                    style = monoSmall,
                    color = color,
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        // Overlaid multi-series line chart drawn on a Canvas.
        MultiSeriesLineChart(artists = artists)
    }
}

@Composable
private fun MultiSeriesLineChart(artists: List<LabelComparisonArtist>) {
    // Union of all dates across artists, sorted, so all series share one x-axis.
    val allDates = artists
        .flatMap { series -> series.dailyPlays.map { it.date } }
        .distinct()
        .sorted()

    val maxCount = artists
        .flatMap { series -> series.dailyPlays.map { it.count } }
        .maxOrNull() ?: 0

    if (allDates.isEmpty() || maxCount <= 0) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(160.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "No plays in this period",
                style = MaterialTheme.typography.bodySmall,
                color = RbTextTertiary,
            )
        }
        return
    }

    // Precompute per-series counts aligned to the shared date axis.
    val seriesCounts: List<List<Int>> = artists.map { series ->
        val byDate = series.dailyPlays.associate { it.date to it.count }
        allDates.map { date -> byDate[date] ?: 0 }
    }
    val seriesResolvedColors: List<Color> = artists.indices.map { seriesColors[it % seriesColors.size] }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(160.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(RbSurfaceHighlight)
            .padding(12.dp),
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height
            val n = allDates.size
            // Horizontal step; guard against a single point (n == 1).
            val stepX = if (n > 1) w / (n - 1) else 0f

            fun yFor(count: Int): Float {
                val fraction = count.toFloat() / maxCount.toFloat()
                return h - (fraction * h)
            }

            seriesCounts.forEachIndexed { seriesIndex, counts ->
                val color = seriesResolvedColors[seriesIndex]
                if (n == 1) {
                    // Single data point: draw a dot centered horizontally.
                    drawCircle(
                        color = color,
                        radius = 4f,
                        center = Offset(w / 2f, yFor(counts[0])),
                    )
                    return@forEachIndexed
                }
                for (i in 0 until n - 1) {
                    val start = Offset(i * stepX, yFor(counts[i]))
                    val end = Offset((i + 1) * stepX, yFor(counts[i + 1]))
                    drawLine(
                        color = color,
                        start = start,
                        end = end,
                        strokeWidth = 3f,
                    )
                }
                // Point markers.
                for (i in 0 until n) {
                    drawCircle(
                        color = color,
                        radius = 3f,
                        center = Offset(i * stepX, yFor(counts[i])),
                    )
                }
            }
        }
    }

    Spacer(Modifier.height(6.dp))
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = allDates.first().takeLast(5),
            style = monoSmall,
            color = RbTextTertiary,
        )
        Text(
            text = "peak ${fmtInt(maxCount)}",
            style = monoSmall,
            color = RbTextTertiary,
        )
        Text(
            text = allDates.last().takeLast(5),
            style = monoSmall,
            color = RbTextTertiary,
        )
    }
}
