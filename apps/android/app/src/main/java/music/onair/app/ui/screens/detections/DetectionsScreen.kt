package music.onair.app.ui.screens.detections

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import kotlinx.coroutines.flow.distinctUntilChanged
import music.onair.app.core.DateFormat
import music.onair.app.core.ServiceLocator
import music.onair.app.data.model.AirplayEvent
import music.onair.app.ui.components.CenterEmpty
import music.onair.app.ui.components.CenterError
import music.onair.app.ui.components.CenterLoading
import music.onair.app.ui.components.InlineLoadingRow
import music.onair.app.ui.theme.IbmPlexMono
import music.onair.app.ui.theme.RbAccent
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextQuaternary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.theme.RbTextTertiary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DetectionsScreen() {
    val vm: DetectionsViewModel = viewModel(
        factory = viewModelFactory { initializer { DetectionsViewModel(ServiceLocator.api) } },
    )

    var detail by remember { mutableStateOf<AirplayEvent?>(null) }
    val selected = detail
    if (selected != null) {
        SongDetailScreen(event = selected, onBack = { detail = null })
        return
    }

    val listState = rememberLazyListState()
    LaunchedEffect(listState) {
        androidx.compose.runtime.snapshotFlow {
            val last = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: -1
            last to vm.items.size
        }
            .distinctUntilChanged()
            .collect { (last, size) ->
                if (size > 0 && last >= size - 5) vm.loadMore()
            }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .statusBarsPadding(),
    ) {
        Text(
            text = "Detections",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 8.dp),
        )

        Box(modifier = Modifier.weight(1f)) {
            when {
                vm.isLoading && vm.items.isEmpty() -> CenterLoading()
                vm.error != null && vm.items.isEmpty() -> CenterError(
                    message = vm.error ?: "Something went wrong",
                    onRetry = { vm.refresh() },
                )
                vm.items.isEmpty() -> CenterEmpty("No detections yet.")
                else -> PullToRefreshBox(
                    isRefreshing = vm.isLoading,
                    onRefresh = { vm.refresh() },
                ) {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 16.dp),
                    ) {
                        items(vm.items, key = { it.id }) { event ->
                            DetectionRow(event = event, onOpen = { detail = event })
                        }
                        if (vm.isLoadingMore) {
                            item { InlineLoadingRow(Modifier.fillMaxWidth()) }
                        }
                    }
                }
            }
        }
    }
}

private val monoSmall = TextStyle(fontFamily = IbmPlexMono, fontSize = 11.sp)

@Composable
private fun DetectionRow(event: AirplayEvent, onOpen: () -> Unit) {
    val audio = ServiceLocator.audioPlayer
    val isActive = audio.currentlyPlayingId == event.id

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onOpen)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(RbAccent),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Filled.MusicNote,
                contentDescription = null,
                tint = Color.White.copy(alpha = 0.9f),
                modifier = Modifier.size(18.dp),
            )
        }

        Spacer(Modifier.width(12.dp))

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = event.songTitle,
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
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
            event.station?.name?.let { stationName ->
                Text(
                    text = stationName,
                    style = MaterialTheme.typography.labelSmall,
                    color = RbTextQuaternary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }

        Spacer(Modifier.width(8.dp))

        Text(
            text = DateFormat.shortDateTime(event.startedAt),
            style = monoSmall,
            color = RbTextTertiary,
        )

        if (event.snippetUrl != null) {
            Spacer(Modifier.width(8.dp))
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .clickable { audio.toggle(event.id) },
                contentAlignment = Alignment.Center,
            ) {
                if (isActive && audio.isLoading) {
                    CircularProgressIndicator(
                        color = RbAccent,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(20.dp),
                    )
                } else {
                    Icon(
                        imageVector = if (isActive && audio.isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                        contentDescription = "Play snippet",
                        tint = RbAccent,
                        modifier = Modifier.size(26.dp),
                    )
                }
            }
        }
    }
}
