package music.onair.app.ui.screens.label

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import coil.compose.AsyncImage
import music.onair.app.core.ServiceLocator
import music.onair.app.data.model.LabelArtistItem
import music.onair.app.ui.components.CenterEmpty
import music.onair.app.ui.components.CenterError
import music.onair.app.ui.components.CenterLoading
import music.onair.app.ui.components.GlassCard
import music.onair.app.ui.theme.IbmPlexMono
import music.onair.app.ui.theme.RbAccent
import music.onair.app.ui.theme.RbAccentLight
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.theme.RbTextTertiary

private fun fmt(n: Int) = "%,d".format(n)
private val monoSmall = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp)

@Composable
fun LabelArtistsScreen() {
    val vm: LabelArtistsViewModel = viewModel(
        factory = viewModelFactory { initializer { LabelArtistsViewModel(ServiceLocator.api) } },
    )

    // Rotation-safe read-only detail: only primitives saved.
    var detailArtistId by rememberSaveable { mutableStateOf<Int?>(null) }
    var detailArtistName by rememberSaveable { mutableStateOf("") }
    val selectedArtistId = detailArtistId
    if (selectedArtistId != null) {
        LabelArtistDetailScreen(
            artistId = selectedArtistId,
            artistName = detailArtistName,
            onBack = { detailArtistId = null },
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
            text = "My Artists",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 12.dp),
        )

        val data = vm.data
        when {
            vm.isLoading && data == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) { CenterLoading() }
            vm.error != null && data == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterError(message = vm.error ?: "Error", onRetry = { vm.refresh() })
                }
            data != null && data.isEmpty() ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterEmpty(message = "No artists yet")
                }
            data != null ->
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(data, key = { it.id }) { artist ->
                        ArtistRow(
                            artist = artist,
                            onClick = {
                                detailArtistId = artist.id
                                detailArtistName = artist.artistName
                            },
                        )
                    }
                }
        }
    }
}

@Composable
private fun ArtistRow(artist: LabelArtistItem, onClick: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AvatarCircle(
                name = artist.artistName,
                pictureUrl = artist.pictureUrl,
            )
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    text = artist.artistName.ifBlank { "Unknown artist" },
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = RbTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = "${fmt(artist.totalPlays)} plays · ${artist.songCount} songs",
                    style = monoSmall,
                    color = RbAccentLight,
                )
                artist.topSong?.takeIf { it.isNotBlank() }?.let { top ->
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "Top: $top",
                        style = MaterialTheme.typography.labelSmall,
                        color = RbTextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

@Composable
private fun AvatarCircle(name: String, pictureUrl: String?) {
    val initial = name.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "?"
    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(CircleShape)
            .background(RbAccent),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = initial,
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            color = Color.White,
        )
        if (!pictureUrl.isNullOrBlank()) {
            AsyncImage(
                model = pictureUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .clip(CircleShape),
            )
        }
    }
}
