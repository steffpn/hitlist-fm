package fm.hitlist.app.ui.screens.artists

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import fm.hitlist.app.core.ServiceLocator
import fm.hitlist.app.data.model.ArtistsSummaryItem
import fm.hitlist.app.ui.components.CenterEmpty
import fm.hitlist.app.ui.components.CenterError
import fm.hitlist.app.ui.components.CenterLoading
import fm.hitlist.app.ui.components.PeriodPicker
import fm.hitlist.app.ui.theme.RbAccent
import fm.hitlist.app.ui.theme.RbBackground
import fm.hitlist.app.ui.theme.RbSurfaceLight
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextSecondary
import fm.hitlist.app.ui.theme.RbTextTertiary

@Composable
fun AdminArtistsScreen() {
    val vm: ArtistsViewModel = viewModel(
        factory = viewModelFactory { initializer { ArtistsViewModel(ServiceLocator.api) } },
    )

    // Rotation-safe read-only detail (primitives only).
    var detailName by rememberSaveable { mutableStateOf<String?>(null) }
    val selectedName = detailName
    if (selectedName != null) {
        val summary = vm.artists.firstOrNull { it.artistName == selectedName }
        AdminArtistDetailScreen(
            artistName = selectedName,
            playCount = summary?.playCount ?: 0,
            songCount = summary?.songCount ?: 0,
            stationCount = summary?.stationCount ?: 0,
            onBack = { detailName = null },
        )
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .statusBarsPadding(),
    ) {
        Text(
            text = "Artists",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 8.dp),
        )

        PeriodPicker(
            selected = vm.period,
            onSelect = vm::selectPeriod,
            modifier = Modifier.padding(horizontal = 20.dp),
        )

        OutlinedTextField(
            value = vm.query,
            onValueChange = vm::onQueryChange,
            placeholder = { Text("Search artists") },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null, tint = RbTextTertiary) },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = RbAccent,
                unfocusedBorderColor = RbSurfaceLight,
                cursorColor = RbAccent,
                focusedTextColor = RbTextPrimary,
                unfocusedTextColor = RbTextPrimary,
            ),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 6.dp),
        )

        Box(modifier = Modifier.weight(1f)) {
            when {
                vm.isLoading && vm.artists.isEmpty() -> CenterLoading()
                vm.error != null && vm.artists.isEmpty() ->
                    CenterError(message = vm.error ?: "Error", onRetry = { vm.refresh() })
                vm.filtered.isEmpty() -> CenterEmpty("No artists in this period.")
                else -> LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(vertical = 6.dp, horizontal = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    items(vm.filtered, key = { it.artistName }) { artist ->
                        ArtistRow(artist, onClick = { detailName = artist.artistName })
                    }
                }
            }
        }
    }
}

@Composable
private fun ArtistRow(artist: ArtistsSummaryItem, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(46.dp)
                .clip(CircleShape)
                .background(RbAccent),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = artist.artistName.firstOrNull()?.uppercase() ?: "?",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = Color.White,
            )
        }

        Spacer(Modifier.width(14.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = artist.artistName,
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                color = RbTextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = "${artist.playCount} plays · ${artist.songCount} songs · ${artist.stationCount} stations",
                style = MaterialTheme.typography.bodySmall,
                color = RbTextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}
