package music.onair.app.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import music.onair.app.data.model.AuthUser
import music.onair.app.ui.components.GradientButton
import music.onair.app.ui.theme.RbAccentLight
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbGlassTint
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.theme.RbTextTertiary

@Composable
fun SettingsScreen(
    user: AuthUser,
    canViewAsRole: Boolean = false,
    onViewAsRole: () -> Unit = {},
    onLogout: () -> Unit,
) {
    var route by remember { mutableStateOf<String?>(null) }
    when (route) {
        "preferences" -> {
            PreferencesScreen(onBack = { route = null })
            return
        }
        "subscription" -> {
            SubscriptionScreen(onBack = { route = null })
            return
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .statusBarsPadding()
            .padding(20.dp),
    ) {
        Spacer(Modifier.height(12.dp))
        Text(
            text = "Settings",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
        )

        Spacer(Modifier.height(24.dp))

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(RbGlassTint)
                .padding(18.dp),
        ) {
            Text(text = user.name, style = MaterialTheme.typography.titleLarge, color = RbTextPrimary)
            Spacer(Modifier.height(2.dp))
            Text(text = user.email, style = MaterialTheme.typography.bodyMedium, color = RbTextSecondary)
            Spacer(Modifier.height(10.dp))
            Column(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(RbGlassTint)
                    .padding(horizontal = 12.dp, vertical = 5.dp),
            ) {
                Text(text = user.role.uppercase(), style = MaterialTheme.typography.labelMedium, color = RbAccentLight)
            }
        }

        Spacer(Modifier.height(16.dp))
        if (canViewAsRole) {
            SettingsNavRow(Icons.Filled.Visibility, "View as role", onClick = onViewAsRole)
            Spacer(Modifier.height(12.dp))
        }
        SettingsNavRow(Icons.Filled.Notifications, "Preferences", onClick = { route = "preferences" })
        Spacer(Modifier.height(12.dp))
        SettingsNavRow(Icons.Filled.CreditCard, "Plan & billing", onClick = { route = "subscription" })

        Spacer(Modifier.weight(1f))

        GradientButton(text = "Log out", onClick = onLogout, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun SettingsNavRow(icon: ImageVector, title: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(RbGlassTint)
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = RbAccentLight)
        Spacer(Modifier.width(12.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = RbTextPrimary,
            modifier = Modifier.weight(1f),
        )
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = RbTextTertiary)
    }
}
