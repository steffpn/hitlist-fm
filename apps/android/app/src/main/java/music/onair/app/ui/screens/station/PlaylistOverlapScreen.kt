package music.onair.app.ui.screens.station

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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import kotlinx.coroutines.launch
import music.onair.app.core.ServiceLocator
import music.onair.app.data.model.CompetitorSummaryItem
import music.onair.app.data.model.OverlapSharedSong
import music.onair.app.data.model.PlaylistOverlapResponse
import music.onair.app.data.remote.OnairApi
import music.onair.app.ui.components.CenterEmpty
import music.onair.app.ui.components.CenterError
import music.onair.app.ui.components.CenterLoading
import music.onair.app.ui.components.GlassCard
import music.onair.app.ui.components.Period
import music.onair.app.ui.components.PeriodPicker
import music.onair.app.ui.theme.IbmPlexMono
import music.onair.app.ui.theme.RbAccent
import music.onair.app.ui.theme.RbAccentLight
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbHairline
import music.onair.app.ui.theme.RbSuccess
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.theme.RbTextTertiary
import music.onair.app.ui.theme.RbWarm

private val monoSmall = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp)

class PlaylistOverlapViewModel(private val api: OnairApi) : ViewModel() {
    var period by mutableStateOf(Period.WEEK)
        private set
    var cards by mutableStateOf<List<CompetitorSummaryItem>?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    var expandedStationId by mutableStateOf<Int?>(null)
        private set
    var overlap by mutableStateOf<PlaylistOverlapResponse?>(null)
        private set
    var overlapLoading by mutableStateOf(false)
        private set
    var overlapError by mutableStateOf<String?>(null)
        private set

    init {
        load()
    }

    fun refresh() = load()

    fun selectPeriod(newPeriod: Period) {
        if (newPeriod == period) return
        period = newPeriod
        load()
        expandedStationId?.let { loadOverlap(it) }
    }

    fun toggleExpanded(stationId: Int) {
        if (expandedStationId == stationId) {
            expandedStationId = null
            overlap = null
            overlapError = null
        } else {
            expandedStationId = stationId
            loadOverlap(stationId)
        }
    }

    private fun load() {
        viewModelScope.launch {
            isLoading = true
            error = null
            try {
                cards = api.getCompetitorSummary(period.value)
            } catch (e: Exception) {
                error = e.message ?: "Failed to load competitors"
            } finally {
                isLoading = false
            }
        }
    }

    private fun loadOverlap(stationId: Int) {
        viewModelScope.launch {
            overlapLoading = true
            overlapError = null
            overlap = null
            try {
                overlap = api.getPlaylistOverlap(stationId, period.value)
            } catch (e: Exception) {
                overlapError = e.message ?: "Failed to load overlap"
            } finally {
                overlapLoading = false
            }
        }
    }
}

/** Playlist overlap vs competitors (port of the iOS PlaylistOverlapView). */
@Composable
fun PlaylistOverlapScreen() {
    val vm: PlaylistOverlapViewModel = viewModel(
        factory = viewModelFactory { initializer { PlaylistOverlapViewModel(ServiceLocator.api) } },
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
            text = "Playlist Overlap",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 4.dp),
        )
        Text(
            text = "How much of your playlist competitors share",
            style = MaterialTheme.typography.bodyMedium,
            color = RbTextSecondary,
            modifier = Modifier.padding(horizontal = 20.dp),
        )

        Spacer(Modifier.height(12.dp))
        PeriodPicker(vm.period, vm::selectPeriod, modifier = Modifier.padding(horizontal = 20.dp))
        Spacer(Modifier.height(18.dp))

        val list = vm.cards
        when {
            vm.isLoading && list == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) { CenterLoading() }
            vm.error != null && list == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterError(message = vm.error ?: "Error", onRetry = { vm.refresh() })
                }
            list != null && list.isEmpty() ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterEmpty("Add competitors on the Competitors tab to compare playlists.")
                }
            list != null -> Column(
                modifier = Modifier.padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                list.forEach { card ->
                    OverlapCard(
                        card = card,
                        expanded = vm.expandedStationId == card.stationId,
                        overlap = vm.overlap,
                        overlapLoading = vm.overlapLoading,
                        overlapError = vm.overlapError,
                        onToggle = { vm.toggleExpanded(card.stationId) },
                    )
                }
            }
        }
    }
}

@Composable
private fun OverlapCard(
    card: CompetitorSummaryItem,
    expanded: Boolean,
    overlap: PlaylistOverlapResponse?,
    overlapLoading: Boolean,
    overlapError: String?,
    onToggle: () -> Unit,
) {
    GlassCard(modifier = Modifier.fillMaxWidth(), padding = 14.dp) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onToggle),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = card.stationName,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = RbTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = if (expanded && overlap != null) {
                        "${overlap.sharedCount} shared songs"
                    } else {
                        "${card.playCount} plays"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = RbTextSecondary,
                )
            }
            if (expanded && overlap != null) {
                Text(
                    text = "%.1f%%".format(overlap.overlapPercent),
                    style = TextStyle(fontFamily = IbmPlexMono, fontSize = 18.sp, fontWeight = FontWeight.Bold),
                    color = RbAccentLight,
                )
                Spacer(Modifier.width(8.dp))
            }
            Icon(
                imageVector = if (expanded) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                contentDescription = null,
                tint = RbTextTertiary,
            )
        }

        if (expanded) {
            Spacer(Modifier.height(12.dp))
            Box(Modifier.fillMaxWidth().height(1.dp).background(RbHairline))
            Spacer(Modifier.height(12.dp))

            when {
                overlapLoading -> Box(
                    Modifier.fillMaxWidth().height(80.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = RbAccent, strokeWidth = 2.dp, modifier = Modifier.size(22.dp))
                }
                overlapError != null -> Text(
                    text = overlapError,
                    style = MaterialTheme.typography.bodySmall,
                    color = RbTextTertiary,
                )
                overlap != null -> {
                    Row(Modifier.fillMaxWidth()) {
                        OverlapStat("SHARED", overlap.sharedCount, RbAccentLight, Modifier.weight(1f))
                        OverlapStat("ONLY YOU", overlap.exclusiveToYou, RbSuccess, Modifier.weight(1f))
                        OverlapStat("ONLY THEM", overlap.exclusiveToThem, RbWarm, Modifier.weight(1f))
                    }
                    if (overlap.sharedSongs.isNotEmpty()) {
                        Spacer(Modifier.height(14.dp))
                        Text(
                            text = "SHARED SONGS",
                            style = MaterialTheme.typography.labelSmall,
                            color = RbTextTertiary,
                        )
                        Spacer(Modifier.height(6.dp))
                        overlap.sharedSongs.forEach { song ->
                            SharedSongRow(song)
                            Spacer(Modifier.height(8.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OverlapStat(
    label: String,
    value: Int,
    color: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = "$value", style = monoSmall.copy(fontSize = 16.sp, fontWeight = FontWeight.Bold), color = color)
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = RbTextTertiary)
    }
}

@Composable
private fun SharedSongRow(song: OverlapSharedSong) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(
                text = song.songTitle,
                style = MaterialTheme.typography.bodyMedium,
                color = RbTextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = song.artistName,
                style = MaterialTheme.typography.labelSmall,
                color = RbTextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Spacer(Modifier.width(8.dp))
        Text(text = "you ${song.yourPlays}", style = monoSmall, color = RbSuccess)
        Spacer(Modifier.width(10.dp))
        Text(text = "them ${song.theirPlays}", style = monoSmall, color = RbWarm)
    }
}
