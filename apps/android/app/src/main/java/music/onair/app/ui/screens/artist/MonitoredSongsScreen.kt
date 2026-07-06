package music.onair.app.ui.screens.artist

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import coil.compose.AsyncImage
import music.onair.app.core.ServiceLocator
import music.onair.app.data.model.BrowseTrack
import music.onair.app.data.model.MonitoredSong
import music.onair.app.ui.components.CenterError
import music.onair.app.ui.components.CenterLoading
import music.onair.app.ui.components.GlassCard
import music.onair.app.ui.components.GradientButton
import music.onair.app.ui.components.TrendBadge
import music.onair.app.ui.theme.RbAccent
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbError
import music.onair.app.ui.theme.RbSurface
import music.onair.app.ui.theme.RbSurfaceLight
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.theme.RbTextTertiary

@Composable
fun MonitoredSongsScreen() {
    val vm: MonitoredSongsViewModel = viewModel(
        factory = viewModelFactory { initializer { MonitoredSongsViewModel(ServiceLocator.api) } },
    )

    // Rotation-safe: only primitives are saved; the object is looked up on the fly.
    var analyticsSongId by rememberSaveable { mutableStateOf<Int?>(null) }
    var analyticsSongTitle by rememberSaveable { mutableStateOf<String?>(null) }
    val selectedId = analyticsSongId
    if (selectedId != null) {
        BackHandler {
            analyticsSongId = null
            analyticsSongTitle = null
        }
        ArtistSongAnalyticsScreen(
            songId = selectedId,
            songTitle = analyticsSongTitle ?: "",
            onBack = {
                analyticsSongId = null
                analyticsSongTitle = null
            },
        )
        return
    }

    var showAddSheet by rememberSaveable { mutableStateOf(false) }
    var songPendingDelete by remember { mutableStateOf<MonitoredSong?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .statusBarsPadding(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 20.dp, end = 12.dp, top = 4.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "My Songs",
                style = MaterialTheme.typography.headlineLarge,
                color = RbTextPrimary,
                modifier = Modifier.weight(1f),
            )
            IconButton(onClick = { showAddSheet = true }) {
                Icon(Icons.Filled.Add, contentDescription = "Add song", tint = RbAccent)
            }
        }

        Box(Modifier.weight(1f)) {
            when {
                vm.isLoading && vm.songs.isEmpty() -> CenterLoading()
                vm.error != null && vm.songs.isEmpty() ->
                    CenterError(message = vm.error ?: "Error", onRetry = { vm.refresh() })
                vm.songs.isEmpty() -> EmptySongsState(onAdd = { showAddSheet = true })
                else -> LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(vm.songs, key = { it.id }) { song ->
                        SongCard(
                            song = song,
                            onClick = {
                                analyticsSongId = song.id
                                analyticsSongTitle = song.songTitle
                            },
                            onLongPress = { songPendingDelete = song },
                        )
                    }
                }
            }
        }
    }

    if (showAddSheet) {
        AddSongSheet(
            vm = vm,
            onDismiss = {
                showAddSheet = false
                vm.resetAddSheet()
            },
        )
    }

    songPendingDelete?.let { song ->
        AlertDialog(
            onDismissRequest = { songPendingDelete = null },
            containerColor = RbSurface,
            title = { Text("Stop monitoring?", color = RbTextPrimary) },
            text = {
                Text(
                    "\"${song.songTitle}\" will be removed from your monitored songs. " +
                        "Its detection history stays on the platform.",
                    color = RbTextSecondary,
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        vm.deleteSong(song.id)
                        songPendingDelete = null
                    },
                ) { Text("Remove", color = RbError) }
            },
            dismissButton = {
                TextButton(onClick = { songPendingDelete = null }) {
                    Text("Cancel", color = RbTextTertiary)
                }
            },
        )
    }
}

@Composable
private fun EmptySongsState(onAdd: () -> Unit) {
    Box(Modifier.fillMaxSize().padding(horizontal = 40.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = Icons.Filled.MusicNote,
                contentDescription = null,
                tint = RbTextTertiary,
                modifier = Modifier.size(36.dp),
            )
            Spacer(Modifier.height(12.dp))
            Text(
                text = "No monitored songs yet",
                style = MaterialTheme.typography.titleMedium,
                color = RbTextPrimary,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = "Add a song to start tracking its radio airplay.",
                style = MaterialTheme.typography.bodyMedium,
                color = RbTextSecondary,
            )
            Spacer(Modifier.height(20.dp))
            GradientButton(text = "Add your first song", onClick = onAdd)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddSongSheet(
    vm: MonitoredSongsViewModel,
    onDismiss: () -> Unit,
) {
    var manualMode by rememberSaveable { mutableStateOf(false) }
    var manualTitle by rememberSaveable { mutableStateOf("") }
    var manualArtist by rememberSaveable {
        mutableStateOf(
            ServiceLocator.impersonation.displayName
                ?: ServiceLocator.sessionStore.user?.name.orEmpty(),
        )
    }
    var manualIsrc by rememberSaveable { mutableStateOf("") }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = RbAccent,
        unfocusedBorderColor = RbSurfaceLight,
        focusedLabelColor = RbAccent,
        unfocusedLabelColor = RbTextTertiary,
        cursorColor = RbAccent,
        focusedTextColor = RbTextPrimary,
        unfocusedTextColor = RbTextPrimary,
    )

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = RbSurface,
    ) {
        Column(modifier = Modifier.padding(horizontal = 20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = if (manualMode) "Add song manually" else "Add a song",
                    style = MaterialTheme.typography.titleLarge,
                    color = RbTextPrimary,
                    modifier = Modifier.weight(1f),
                )
                TextButton(onClick = { manualMode = !manualMode }) {
                    Text(
                        text = if (manualMode) "Search catalog" else "Enter manually",
                        color = RbAccent,
                    )
                }
            }

            vm.addError?.let { err ->
                Text(
                    text = err,
                    style = MaterialTheme.typography.bodySmall,
                    color = RbError,
                    modifier = Modifier.padding(vertical = 4.dp),
                )
            }

            if (manualMode) {
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = manualTitle,
                    onValueChange = { manualTitle = it },
                    label = { Text("Song title") },
                    singleLine = true,
                    colors = fieldColors,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = manualArtist,
                    onValueChange = { manualArtist = it },
                    label = { Text("Artist name") },
                    singleLine = true,
                    colors = fieldColors,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = manualIsrc,
                    onValueChange = { manualIsrc = it.uppercase() },
                    label = { Text("ISRC (e.g. ROA1G2400001)") },
                    singleLine = true,
                    colors = fieldColors,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(18.dp))
                GradientButton(
                    text = "Add song",
                    onClick = {
                        vm.addSong(manualTitle, manualArtist, manualIsrc, onSuccess = onDismiss)
                    },
                    enabled = manualTitle.isNotBlank() && manualArtist.isNotBlank() &&
                        manualIsrc.isNotBlank() && !vm.isSaving,
                    loading = vm.isSaving,
                )
                Spacer(Modifier.height(32.dp))
            } else {
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = vm.searchQuery,
                    onValueChange = vm::onSearchQueryChange,
                    label = { Text("Search your songs in the catalog") },
                    singleLine = true,
                    colors = fieldColors,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))

                when {
                    vm.isSearching -> Box(
                        Modifier.fillMaxWidth().height(120.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator(color = RbAccent, strokeWidth = 2.dp, modifier = Modifier.size(24.dp))
                    }
                    vm.searchQuery.trim().length >= 2 && vm.searchResults.isEmpty() -> Box(
                        Modifier.fillMaxWidth().height(120.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "No matches. Try a different search or enter the song manually.",
                            style = MaterialTheme.typography.bodySmall,
                            color = RbTextTertiary,
                        )
                    }
                    else -> LazyColumn(contentPadding = PaddingValues(bottom = 32.dp)) {
                        items(vm.searchResults) { track ->
                            BrowseTrackRow(
                                track = track,
                                enabled = !track.isrc.isNullOrBlank() && !vm.isSaving,
                                onClick = {
                                    val isrc = track.isrc ?: return@BrowseTrackRow
                                    vm.addSong(track.title, track.artist, isrc, onSuccess = onDismiss)
                                },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BrowseTrackRow(
    track: BrowseTrack,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(vertical = 8.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(RbAccent.copy(alpha = if (enabled) 1f else 0.4f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Filled.MusicNote,
                contentDescription = null,
                tint = Color.White.copy(alpha = 0.9f),
                modifier = Modifier.size(16.dp),
            )
            if (!track.coverUrl.isNullOrBlank()) {
                AsyncImage(
                    model = track.coverUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(8.dp)),
                )
            }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = track.title,
                style = MaterialTheme.typography.bodyLarge,
                color = if (enabled) RbTextPrimary else RbTextTertiary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = if (track.isrc.isNullOrBlank()) "${track.artist} · no ISRC available" else track.artist,
                style = MaterialTheme.typography.bodySmall,
                color = RbTextTertiary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Spacer(Modifier.width(8.dp))
        if (enabled) {
            Icon(Icons.Filled.Add, contentDescription = "Add", tint = RbAccent, modifier = Modifier.size(20.dp))
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun SongCard(song: MonitoredSong, onClick: () -> Unit, onLongPress: () -> Unit) {
    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(onClick = onClick, onLongClick = onLongPress),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = song.songTitle,
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = RbTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = "${song.totalPlays} plays · ${song.stationCount} stations",
                    style = MaterialTheme.typography.bodySmall,
                    color = RbTextSecondary,
                )
            }
            song.trend?.let {
                Spacer(Modifier.width(10.dp))
                TrendBadge(direction = it.direction, percentChange = it.percentChange)
            }
        }
    }
}
