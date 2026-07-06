package fm.hitlist.app.ui.screens.settings

import androidx.activity.compose.BackHandler
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
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import fm.hitlist.app.BuildConfig
import fm.hitlist.app.core.ServiceLocator
import fm.hitlist.app.data.model.AuthUser
import fm.hitlist.app.ui.components.GradientButton
import fm.hitlist.app.ui.theme.RbAccentLight
import fm.hitlist.app.ui.theme.RbBackground
import fm.hitlist.app.ui.theme.RbError
import fm.hitlist.app.ui.theme.RbGlassTint
import fm.hitlist.app.ui.theme.RbSurface
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextSecondary
import fm.hitlist.app.ui.theme.RbTextTertiary

@Composable
fun SettingsScreen(
    user: AuthUser,
    canViewAsRole: Boolean = false,
    onViewAsRole: () -> Unit = {},
    onLogout: () -> Unit,
) {
    var route by rememberSaveable { mutableStateOf<String?>(null) }
    when (route) {
        "preferences" -> {
            BackHandler { route = null }
            PreferencesScreen(onBack = { route = null })
            return
        }
        "subscription" -> {
            BackHandler { route = null }
            SubscriptionScreen(role = user.role, onBack = { route = null })
            return
        }
    }

    // Delete account: double confirmation, then DELETE /auth/account → logout.
    var deleteStep by remember { mutableStateOf(0) } // 0 = hidden, 1 = first confirm, 2 = final confirm
    var deleteError by remember { mutableStateOf<String?>(null) }
    var isDeleting by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .statusBarsPadding()
            .padding(20.dp),
    ) {
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
        Spacer(Modifier.height(12.dp))
        SettingsNavRow(
            icon = Icons.Filled.DeleteForever,
            title = "Delete account",
            danger = true,
            onClick = {
                deleteError = null
                deleteStep = 1
            },
        )

        deleteError?.let { err ->
            Spacer(Modifier.height(8.dp))
            Text(
                text = err,
                style = MaterialTheme.typography.bodySmall,
                color = RbError,
            )
        }

        Spacer(Modifier.weight(1f))

        GradientButton(text = "Log out", onClick = onLogout, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(10.dp))
        Text(
            text = "Version ${BuildConfig.VERSION_NAME}",
            style = MaterialTheme.typography.labelSmall,
            color = RbTextTertiary,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(8.dp))
    }

    if (deleteStep == 1) {
        AlertDialog(
            onDismissRequest = { deleteStep = 0 },
            containerColor = RbSurface,
            title = { Text("Delete account?", color = RbTextPrimary) },
            text = {
                Text(
                    "This permanently deletes your account, monitored songs, competitors and settings.",
                    color = RbTextSecondary,
                )
            },
            confirmButton = {
                TextButton(onClick = { deleteStep = 2 }) { Text("Continue", color = RbError) }
            },
            dismissButton = {
                TextButton(onClick = { deleteStep = 0 }) { Text("Cancel", color = RbTextTertiary) }
            },
        )
    }

    if (deleteStep == 2) {
        AlertDialog(
            onDismissRequest = { if (!isDeleting) deleteStep = 0 },
            containerColor = RbSurface,
            title = { Text("Are you absolutely sure?", color = RbTextPrimary) },
            text = {
                Text(
                    "There is no way to undo this. Your data will be erased immediately.",
                    color = RbTextSecondary,
                )
            },
            confirmButton = {
                TextButton(
                    enabled = !isDeleting,
                    onClick = {
                        isDeleting = true
                        scope.launch {
                            try {
                                ServiceLocator.api.deleteAccount()
                                deleteStep = 0
                                onLogout()
                            } catch (e: Exception) {
                                deleteError = e.message ?: "Failed to delete account"
                                deleteStep = 0
                            } finally {
                                isDeleting = false
                            }
                        }
                    },
                ) { Text(if (isDeleting) "Deleting…" else "Delete forever", color = RbError) }
            },
            dismissButton = {
                TextButton(enabled = !isDeleting, onClick = { deleteStep = 0 }) {
                    Text("Cancel", color = RbTextTertiary)
                }
            },
        )
    }
}

@Composable
private fun SettingsNavRow(
    icon: ImageVector,
    title: String,
    onClick: () -> Unit,
    danger: Boolean = false,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(RbGlassTint)
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = if (danger) RbError else RbAccentLight)
        Spacer(Modifier.width(12.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = if (danger) RbError else RbTextPrimary,
            modifier = Modifier.weight(1f),
        )
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = RbTextTertiary)
    }
}
