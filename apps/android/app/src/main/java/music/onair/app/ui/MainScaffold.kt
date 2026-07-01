package music.onair.app.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.QueueMusic
import androidx.compose.material.icons.filled.Radio
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShowChart
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import music.onair.app.data.model.AuthUser
import music.onair.app.ui.components.PlaceholderScreen
import music.onair.app.ui.screens.artist.ArtistDashboardScreen
import music.onair.app.ui.screens.artist.MonitoredSongsScreen
import music.onair.app.ui.screens.artists.AdminArtistsScreen
import music.onair.app.ui.screens.dashboard.AdminDashboardScreen
import music.onair.app.ui.screens.detections.DetectionsScreen
import music.onair.app.ui.screens.label.LabelArtistsScreen
import music.onair.app.ui.screens.label.LabelDashboardScreen
import music.onair.app.ui.screens.label.LabelInsightsMenuScreen
import music.onair.app.ui.screens.settings.SettingsScreen
import music.onair.app.ui.screens.station.CompetitorsScreen
import music.onair.app.ui.screens.station.StationAnalyticsMenuScreen
import music.onair.app.ui.screens.station.StationDashboardScreen
import music.onair.app.ui.theme.RbAccent
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbSurface
import music.onair.app.ui.theme.RbSurfaceHighlight
import music.onair.app.ui.theme.RbTextQuaternary

private data class TabSpec(
    val label: String,
    val icon: ImageVector,
    val content: @Composable () -> Unit,
)

/** Role-based bottom-tab shell, mirroring iOS MainTabView. */
@Composable
fun MainScaffold(
    user: AuthUser,
    canViewAsRole: Boolean,
    onViewAsRole: () -> Unit,
    onLogout: () -> Unit,
) {
    val detections: @Composable () -> Unit = { DetectionsScreen() }
    val settings: @Composable () -> Unit = {
        SettingsScreen(
            user = user,
            canViewAsRole = canViewAsRole,
            onViewAsRole = onViewAsRole,
            onLogout = onLogout,
        )
    }
    fun soon(title: String): @Composable () -> Unit = { PlaceholderScreen(title = title) }

    val tabs = when (user.role.uppercase()) {
        "ARTIST" -> listOf(
            TabSpec("Dashboard", Icons.Filled.BarChart, { ArtistDashboardScreen() }),
            TabSpec("My Songs", Icons.Filled.QueueMusic, { MonitoredSongsScreen() }),
            TabSpec("Detections", Icons.Filled.GraphicEq, detections),
            TabSpec("Settings", Icons.Filled.Settings, settings),
        )
        "LABEL" -> listOf(
            TabSpec("Dashboard", Icons.Filled.BarChart, { LabelDashboardScreen() }),
            TabSpec("Artists", Icons.Filled.Groups, { LabelArtistsScreen() }),
            TabSpec("Detections", Icons.Filled.GraphicEq, detections),
            TabSpec("Insights", Icons.Filled.Lightbulb, { LabelInsightsMenuScreen() }),
            TabSpec("Settings", Icons.Filled.Settings, settings),
        )
        "STATION" -> listOf(
            TabSpec("Station", Icons.Filled.Radio, { StationDashboardScreen() }),
            TabSpec("Competitors", Icons.Filled.Groups, { CompetitorsScreen() }),
            TabSpec("Analytics", Icons.Filled.ShowChart, { StationAnalyticsMenuScreen() }),
            TabSpec("Settings", Icons.Filled.Settings, settings),
        )
        else -> listOf( // ADMIN (default)
            TabSpec("Dashboard", Icons.Filled.BarChart, { AdminDashboardScreen() }),
            TabSpec("Detections", Icons.Filled.GraphicEq, detections),
            TabSpec("Artists", Icons.Filled.Group, { AdminArtistsScreen() }),
            TabSpec("Settings", Icons.Filled.Settings, settings),
        )
    }

    var selected by rememberSaveable { mutableIntStateOf(0) }
    if (selected >= tabs.size) selected = 0

    Scaffold(
        containerColor = RbBackground,
        bottomBar = {
            NavigationBar(containerColor = RbSurface) {
                tabs.forEachIndexed { index, tab ->
                    NavigationBarItem(
                        selected = selected == index,
                        onClick = { selected = index },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = RbAccent,
                            selectedTextColor = RbAccent,
                            indicatorColor = RbSurfaceHighlight,
                            unselectedIconColor = RbTextQuaternary,
                            unselectedTextColor = RbTextQuaternary,
                        ),
                    )
                }
            }
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            tabs[selected].content()
        }
    }
}
