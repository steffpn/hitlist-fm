package fm.hitlist.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.PersonOff
import androidx.compose.material.icons.filled.QueueMusic
import androidx.compose.material.icons.filled.Radio
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShowChart
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import fm.hitlist.app.data.model.AuthUser
import fm.hitlist.app.ui.components.GradientButton
import fm.hitlist.app.ui.components.NowPlayingBar
import fm.hitlist.app.ui.screens.artist.ArtistDashboardScreen
import fm.hitlist.app.ui.screens.artist.MonitoredSongsScreen
import fm.hitlist.app.ui.screens.artists.AdminArtistsScreen
import fm.hitlist.app.ui.screens.dashboard.AdminDashboardScreen
import fm.hitlist.app.ui.screens.detections.DetectionsScreen
import fm.hitlist.app.ui.screens.label.LabelArtistsScreen
import fm.hitlist.app.ui.screens.label.LabelDashboardScreen
import fm.hitlist.app.ui.screens.label.LabelInsightsMenuScreen
import fm.hitlist.app.ui.screens.settings.SettingsScreen
import fm.hitlist.app.ui.screens.station.CompetitorsScreen
import fm.hitlist.app.ui.screens.station.StationAnalyticsMenuScreen
import fm.hitlist.app.ui.screens.station.StationDashboardScreen
import fm.hitlist.app.ui.theme.RbAccent
import fm.hitlist.app.ui.theme.RbBackground
import fm.hitlist.app.ui.theme.RbSurface
import fm.hitlist.app.ui.theme.RbSurfaceHighlight
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextQuaternary
import fm.hitlist.app.ui.theme.RbTextSecondary
import fm.hitlist.app.ui.theme.RbTextTertiary

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
    requestedTab: String? = null,
    onTabRequestConsumed: () -> Unit = {},
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
        "ADMIN" -> listOf(
            TabSpec("Dashboard", Icons.Filled.BarChart, { AdminDashboardScreen() }),
            TabSpec("Detections", Icons.Filled.GraphicEq, detections),
            TabSpec("Artists", Icons.Filled.Group, { AdminArtistsScreen() }),
            TabSpec("Settings", Icons.Filled.Settings, settings),
        )
        // Unknown role: show a safe "account not configured" screen instead of admin tabs.
        else -> {
            UnconfiguredAccountScreen(role = user.role, onLogout = onLogout)
            return
        }
    }

    var selected by rememberSaveable { mutableIntStateOf(0) }
    if (selected >= tabs.size) selected = 0

    // Push routing (e.g. chart_alert → Detections tab).
    LaunchedEffect(requestedTab) {
        if (requestedTab != null) {
            tabs.indexOfFirst { it.label == requestedTab }.takeIf { it >= 0 }?.let { selected = it }
            onTabRequestConsumed()
        }
    }

    Scaffold(
        containerColor = RbBackground,
        bottomBar = {
            Column {
                NowPlayingBar()
                NavigationBar(containerColor = RbSurface) {
                    tabs.forEachIndexed { index, tab ->
                        NavigationBarItem(
                            selected = selected == index,
                            onClick = { selected = index },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = {
                                Text(
                                    tab.label,
                                    maxLines = 1,
                                    softWrap = false,
                                    overflow = TextOverflow.Ellipsis,
                                    style = MaterialTheme.typography.labelSmall,
                                )
                            },
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

/** Shown when the signed-in user has a role this app doesn't recognize. */
@Composable
private fun UnconfiguredAccountScreen(role: String, onLogout: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .padding(32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = Icons.Filled.PersonOff,
                contentDescription = null,
                tint = RbTextTertiary,
            )
            Spacer(Modifier.height(14.dp))
            Text(
                text = "Account not configured",
                style = MaterialTheme.typography.titleLarge,
                color = RbTextPrimary,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = "Your account role (\"$role\") isn't supported in this app yet. " +
                    "Contact support or sign in with a different account.",
                style = MaterialTheme.typography.bodyMedium,
                color = RbTextSecondary,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(24.dp))
            GradientButton(text = "Log out", onClick = onLogout)
        }
    }
}
