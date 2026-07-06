package fm.hitlist.app.ui.screens.detections

import android.widget.Toast
import androidx.activity.compose.BackHandler
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
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.IosShare
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Radio
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DateRangePicker
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberDateRangePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import coil.compose.AsyncImage
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import fm.hitlist.app.core.CsvExporter
import fm.hitlist.app.core.DateFormat
import fm.hitlist.app.core.ServiceLocator
import fm.hitlist.app.data.model.AirplayEvent
import fm.hitlist.app.ui.components.CenterEmpty
import fm.hitlist.app.ui.components.CenterError
import fm.hitlist.app.ui.components.CenterLoading
import fm.hitlist.app.ui.components.InlineLoadingRow
import fm.hitlist.app.ui.theme.IbmPlexMono
import fm.hitlist.app.ui.theme.RbAccent
import fm.hitlist.app.ui.theme.RbBackground
import fm.hitlist.app.ui.theme.RbSurface
import fm.hitlist.app.ui.theme.RbSurfaceHighlight
import fm.hitlist.app.ui.theme.RbSurfaceLight
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextQuaternary
import fm.hitlist.app.ui.theme.RbTextSecondary
import fm.hitlist.app.ui.theme.RbTextTertiary
import fm.hitlist.app.ui.theme.RbWarm
import java.time.Instant
import java.time.ZoneOffset

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DetectionsScreen() {
    val vm: DetectionsViewModel = viewModel(
        factory = viewModelFactory { initializer { DetectionsViewModel(ServiceLocator.api) } },
    )

    // Survives rotation: only the id is saved; the event is looked up in the list.
    var detailId by rememberSaveable { mutableStateOf<Int?>(null) }
    val selected = detailId?.let { id -> vm.items.firstOrNull { it.id == id } }
    if (selected != null) {
        BackHandler { detailId = null }
        SongDetailScreen(event = selected, onBack = { detailId = null })
        return
    }

    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var isExporting by remember { mutableStateOf(false) }
    var showStationSheet by remember { mutableStateOf(false) }
    var showDatePicker by remember { mutableStateOf(false) }

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
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 20.dp, end = 12.dp, top = 4.dp, bottom = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Detections",
                style = MaterialTheme.typography.headlineLarge,
                color = RbTextPrimary,
                modifier = Modifier.weight(1f),
            )
            // CSV export with the current filters.
            IconButton(
                onClick = {
                    if (isExporting) return@IconButton
                    isExporting = true
                    scope.launch {
                        try {
                            CsvExporter.exportAndShare(
                                context = context,
                                query = vm.query.trim().takeIf { it.isNotEmpty() },
                                startDate = vm.startDate,
                                endDate = vm.endDate,
                                stationId = vm.stationId,
                            )
                        } catch (e: Exception) {
                            Toast.makeText(context, e.message ?: "Export failed", Toast.LENGTH_SHORT).show()
                        } finally {
                            isExporting = false
                        }
                    }
                },
            ) {
                if (isExporting) {
                    CircularProgressIndicator(color = RbAccent, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                } else {
                    Icon(Icons.Filled.IosShare, contentDescription = "Export CSV", tint = RbTextSecondary)
                }
            }
        }

        // ── Search ──
        OutlinedTextField(
            value = vm.query,
            onValueChange = vm::onQueryChange,
            placeholder = { Text("Search song or artist") },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null, tint = RbTextTertiary) },
            trailingIcon = {
                if (vm.query.isNotEmpty()) {
                    IconButton(onClick = { vm.onQueryChange("") }) {
                        Icon(Icons.Filled.Close, contentDescription = "Clear search", tint = RbTextTertiary)
                    }
                }
            },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = RbAccent,
                unfocusedBorderColor = RbSurfaceLight,
                cursorColor = RbAccent,
                focusedTextColor = RbTextPrimary,
                unfocusedTextColor = RbTextPrimary,
            ),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 4.dp),
        )

        // ── Filter chips ──
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            val chipColors = FilterChipDefaults.filterChipColors(
                containerColor = RbSurface,
                labelColor = RbTextSecondary,
                iconColor = RbTextSecondary,
                selectedContainerColor = RbSurfaceHighlight,
                selectedLabelColor = RbAccent,
                selectedLeadingIconColor = RbAccent,
                selectedTrailingIconColor = RbAccent,
            )
            FilterChip(
                selected = vm.stationId != null,
                onClick = {
                    vm.loadStations()
                    showStationSheet = true
                },
                label = {
                    Text(
                        text = vm.stationName ?: "Station",
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                },
                leadingIcon = { Icon(Icons.Filled.Radio, contentDescription = null, modifier = Modifier.size(16.dp)) },
                trailingIcon = if (vm.stationId != null) {
                    {
                        Icon(
                            Icons.Filled.Close,
                            contentDescription = "Clear station filter",
                            modifier = Modifier
                                .size(16.dp)
                                .clickable { vm.selectStation(null, null) },
                        )
                    }
                } else null,
                colors = chipColors,
            )
            FilterChip(
                selected = vm.startDate != null,
                onClick = { showDatePicker = true },
                label = {
                    val label = if (vm.startDate != null) {
                        "${vm.startDate} → ${vm.endDate ?: "…"}"
                    } else "Dates"
                    Text(label, maxLines = 1, overflow = TextOverflow.Ellipsis)
                },
                leadingIcon = { Icon(Icons.Filled.DateRange, contentDescription = null, modifier = Modifier.size(16.dp)) },
                trailingIcon = if (vm.startDate != null) {
                    {
                        Icon(
                            Icons.Filled.Close,
                            contentDescription = "Clear date filter",
                            modifier = Modifier
                                .size(16.dp)
                                .clickable { vm.selectDateRange(null, null) },
                        )
                    }
                } else null,
                colors = chipColors,
            )
        }

        Box(modifier = Modifier.weight(1f)) {
            when {
                vm.isLoading && vm.items.isEmpty() -> CenterLoading()
                vm.error != null && vm.items.isEmpty() -> CenterError(
                    message = vm.error ?: "Something went wrong",
                    onRetry = { vm.refresh() },
                )
                vm.items.isEmpty() -> CenterEmpty(
                    if (vm.hasActiveFilters) "No detections match your filters." else "No detections yet.",
                )
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
                            DetectionRow(event = event, onOpen = { detailId = event.id })
                        }
                        if (vm.isLoadingMore) {
                            item { InlineLoadingRow(Modifier.fillMaxWidth()) }
                        }
                    }
                }
            }
        }
    }

    // ── Station picker sheet ──
    if (showStationSheet) {
        ModalBottomSheet(
            onDismissRequest = { showStationSheet = false },
            containerColor = RbSurface,
        ) {
            Text(
                text = "Filter by station",
                style = MaterialTheme.typography.titleLarge,
                color = RbTextPrimary,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            )
            LazyColumn(contentPadding = PaddingValues(bottom = 32.dp)) {
                item {
                    StationPickerRow(
                        name = "All stations",
                        country = null,
                        selected = vm.stationId == null,
                        onClick = {
                            vm.selectStation(null, null)
                            showStationSheet = false
                        },
                    )
                }
                items(vm.stations, key = { it.id }) { station ->
                    StationPickerRow(
                        name = station.name,
                        country = station.country,
                        selected = vm.stationId == station.id,
                        onClick = {
                            vm.selectStation(station.id, station.name)
                            showStationSheet = false
                        },
                    )
                }
            }
        }
    }

    // ── Date range picker ──
    if (showDatePicker) {
        val pickerState = rememberDateRangePickerState()
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        val start = pickerState.selectedStartDateMillis?.let(::millisToIsoDate)
                        val end = (pickerState.selectedEndDateMillis ?: pickerState.selectedStartDateMillis)
                            ?.let(::millisToIsoDate)
                        vm.selectDateRange(start, end)
                        showDatePicker = false
                    },
                ) { Text("Apply", color = RbAccent) }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) {
                    Text("Cancel", color = RbTextTertiary)
                }
            },
        ) {
            DateRangePicker(
                state = pickerState,
                showModeToggle = false,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

private fun millisToIsoDate(millis: Long): String =
    Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate().toString()

@Composable
private fun StationPickerRow(
    name: String,
    country: String?,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                text = name,
                style = MaterialTheme.typography.bodyLarge,
                color = if (selected) RbAccent else RbTextPrimary,
            )
            country?.let {
                Text(text = it, style = MaterialTheme.typography.labelSmall, color = RbTextTertiary)
            }
        }
        if (selected) {
            Icon(Icons.Filled.Radio, contentDescription = null, tint = RbAccent, modifier = Modifier.size(16.dp))
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
            // Server-cached Deezer artwork replaces the accent square when present.
            if (!event.artworkUrl.isNullOrBlank()) {
                AsyncImage(
                    model = event.artworkUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(10.dp)),
                )
            }
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
            Row(verticalAlignment = Alignment.CenterVertically) {
                event.station?.name?.let { stationName ->
                    Text(
                        text = stationName,
                        style = MaterialTheme.typography.labelSmall,
                        color = RbTextQuaternary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                if (event.partialPlay) {
                    Spacer(Modifier.width(6.dp))
                    Icon(
                        imageVector = Icons.Filled.Warning,
                        contentDescription = "Partial play (under 30s)",
                        tint = RbWarm,
                        modifier = Modifier.size(11.dp),
                    )
                    Spacer(Modifier.width(2.dp))
                    Text(
                        text = "<30s",
                        style = MaterialTheme.typography.labelSmall,
                        color = RbWarm,
                    )
                }
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
                    .clickable { audio.toggle(event.id, event.songTitle, event.station?.name) },
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
