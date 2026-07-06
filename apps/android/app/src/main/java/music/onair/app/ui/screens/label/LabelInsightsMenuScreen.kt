package music.onair.app.ui.screens.label

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
fun LabelInsightsMenuScreen() {
    var route by rememberSaveable { mutableStateOf<String?>(null) }

    if (route != null) {
        BackHandler { route = null }
        when (route) {
            "affinity" -> StationAffinityScreen()
            "comparison" -> LabelComparisonScreen()
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
            text = "Insights",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(top = 4.dp, bottom = 4.dp),
        )
        MenuRow("Station Affinity", "Which stations play your music most", onClick = { route = "affinity" })
        MenuRow("Compare Artists", "Side-by-side artist performance", onClick = { route = "comparison" })
    }
}
