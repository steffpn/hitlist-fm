package fm.hitlist.app.ui.screens.station

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import fm.hitlist.app.core.DateFormat
import fm.hitlist.app.core.ServiceLocator
import fm.hitlist.app.data.model.NewSongItem
import fm.hitlist.app.ui.components.CenterEmpty
import fm.hitlist.app.ui.components.CenterError
import fm.hitlist.app.ui.components.CenterLoading
import fm.hitlist.app.ui.components.GlassCard
import fm.hitlist.app.ui.theme.IbmPlexMono
import fm.hitlist.app.ui.theme.RbBackground
import fm.hitlist.app.ui.theme.RbSuccess
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextSecondary
import fm.hitlist.app.ui.theme.RbTextTertiary

private val monoSmall = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp)

@Composable
fun StationNewSongsScreen() {
    val vm: StationNewSongsViewModel = viewModel(
        factory = viewModelFactory { initializer { StationNewSongsViewModel(ServiceLocator.api) } },
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
            text = "New Songs",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 12.dp),
        )

        val list = vm.songs
        when {
            vm.isLoading && list == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) { CenterLoading() }
            vm.error != null && list == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterError(message = vm.error ?: "Error", onRetry = { vm.refresh() })
                }
            list != null && list.isEmpty() ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterEmpty(message = "No new songs in this period")
                }
            list != null -> {
                Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                    list.forEach { song ->
                        NewSongRow(song)
                        Spacer(Modifier.height(10.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun NewSongRow(song: NewSongItem) {
    GlassCard(padding = 14.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            NewBadge()
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    text = song.songTitle,
                    style = MaterialTheme.typography.bodyLarge,
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
                Spacer(Modifier.height(4.dp))
                Text(
                    text = DateFormat.shortDateTime(song.firstPlayedAt),
                    style = monoSmall,
                    color = RbTextTertiary,
                )
            }
        }
    }
}

@Composable
private fun NewBadge() {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(RbSuccess.copy(alpha = 0.18f))
            .padding(horizontal = 8.dp, vertical = 4.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = "NEW",
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            color = RbSuccess,
        )
    }
}
