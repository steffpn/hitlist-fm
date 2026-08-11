package fm.hitlist.app.ui.screens.songs

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
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
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
import fm.hitlist.app.core.ServiceLocator
import fm.hitlist.app.data.model.SongRow
import fm.hitlist.app.ui.components.CenterEmpty
import fm.hitlist.app.ui.components.CenterError
import fm.hitlist.app.ui.components.CenterLoading
import fm.hitlist.app.ui.components.GlassCard
import fm.hitlist.app.ui.components.PeriodPicker
import fm.hitlist.app.ui.theme.IbmPlexMono
import fm.hitlist.app.ui.theme.RbAccent
import fm.hitlist.app.ui.theme.RbBackground
import fm.hitlist.app.ui.theme.RbSurface
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextSecondary
import fm.hitlist.app.ui.theme.RbTextTertiary

private val mono = TextStyle(fontFamily = IbmPlexMono, fontSize = 13.sp)
private val monoSmall = TextStyle(fontFamily = IbmPlexMono, fontSize = 11.sp)

/**
 * Songs tab.
 *
 * Deliberately one screen for every role: the backend scopes the list (an
 * artist's own tracks, a label's roster, everything a station aired), so the tab
 * adapts instead of the app carrying three near-identical screens.
 */
@Composable
fun SongsScreen() {
    val vm: SongsViewModel = viewModel(
        factory = viewModelFactory { initializer { SongsViewModel(ServiceLocator.api) } },
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .statusBarsPadding(),
    ) {
        Text(
            text = "Songs",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 12.dp),
        )

        PeriodPicker(
            selected = vm.period,
            onSelect = { vm.selectPeriod(it) },
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, bottom = 10.dp),
        )

        OutlinedTextField(
            value = vm.query,
            onValueChange = { vm.onQueryChange(it) },
            placeholder = { Text("Search songs or artists", color = RbTextTertiary) },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null, tint = RbTextTertiary) },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = RbTextPrimary,
                unfocusedTextColor = RbTextPrimary,
                focusedBorderColor = RbAccent,
                unfocusedBorderColor = RbSurface,
                cursorColor = RbAccent,
            ),
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 20.dp, end = 20.dp, bottom = 10.dp),
        )

        val data = vm.data
        when {
            vm.isLoading && data == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) { CenterLoading() }

            vm.error != null && data == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterError(message = vm.error ?: "Error", onRetry = { vm.refresh() })
                }

            data != null && data.songs.isEmpty() ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterEmpty(message = "No plays in this period")
                }

            data != null -> {
                Text(
                    text = "${data.totalPlays} plays · ${data.uniqueSongs} songs" +
                        if (data.truncated) " · showing top ${data.songs.size}" else "",
                    style = monoSmall,
                    color = RbTextTertiary,
                    modifier = Modifier.padding(start = 20.dp, end = 20.dp, bottom = 8.dp),
                )
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(data.songs, key = { it.isrc ?: "${it.artistName}|${it.songTitle}" }) { song ->
                        SongCard(song)
                    }
                }
            }
        }
    }
}

@Composable
private fun SongCard(song: SongRow) {
    var expanded by rememberSaveable(song.isrc ?: song.songTitle) { mutableStateOf(false) }

    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable { expanded = !expanded },
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = song.songTitle,
                    style = MaterialTheme.typography.titleSmall,
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
                Text(
                    text = "${song.stationCount} station${if (song.stationCount == 1) "" else "s"}",
                    style = monoSmall,
                    color = RbTextTertiary,
                )
            }
            Spacer(Modifier.width(12.dp))
            Text(text = "${song.plays}", style = mono, color = RbAccent)
            Icon(
                imageVector = if (expanded) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                contentDescription = if (expanded) "Collapse" else "Show stations",
                tint = RbTextTertiary,
            )
        }

        // Per-station split — the thing labels and artists kept asking for, since
        // a combined total does not say which station is carrying the track.
        if (expanded) {
            Spacer(Modifier.height(10.dp))
            song.byStation.forEach { station ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = station.name,
                        style = MaterialTheme.typography.bodySmall,
                        color = RbTextSecondary,
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(text = "${station.plays}", style = monoSmall, color = RbTextSecondary)
                }
            }
        }
    }
}
