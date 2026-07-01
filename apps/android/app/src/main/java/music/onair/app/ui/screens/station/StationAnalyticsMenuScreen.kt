package music.onair.app.ui.screens.station

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import music.onair.app.ui.components.MenuRow
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbTextPrimary

@Composable
fun StationAnalyticsMenuScreen() {
    var route by rememberSaveable { mutableStateOf<String?>(null) }

    if (route != null) {
        BackHandler { route = null }
        when (route) {
            "discovery" -> DiscoveryScoreScreen()
            "rotation" -> RotationAnalysisScreen()
            "new" -> StationNewSongsScreen()
            "overlap" -> PlaylistOverlapScreen()
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .statusBarsPadding()
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = "Analytics",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(top = 12.dp, bottom = 4.dp),
        )
        MenuRow("Discovery Score", "How much new music you play", onClick = { route = "discovery" })
        MenuRow("Rotation Analysis", "Song rotation patterns & alerts", onClick = { route = "rotation" })
        MenuRow("New Songs", "Songs appearing for the first time", onClick = { route = "new" })
        MenuRow("Playlist Overlap", "Shared songs with your competitors", onClick = { route = "overlap" })
    }
}
