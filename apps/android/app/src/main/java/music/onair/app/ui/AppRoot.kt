package music.onair.app.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import music.onair.app.data.model.AuthUser
import music.onair.app.ui.components.ImpersonationBanner
import music.onair.app.ui.screens.admin.ViewAsRoleScreen
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import music.onair.app.core.PushManager
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import music.onair.app.core.PushNavigator
import music.onair.app.core.ServiceLocator
import music.onair.app.ui.screens.auth.AuthUiState
import music.onair.app.ui.screens.auth.AuthViewModel
import music.onair.app.ui.screens.auth.LoginScreen
import music.onair.app.ui.screens.auth.RegisterFlowScreen
import music.onair.app.ui.screens.auth.WelcomeScreen
import music.onair.app.ui.screens.notifications.DigestDetailScreen
import music.onair.app.ui.theme.RbAccent
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbTextPrimary

@Composable
fun AppRoot() {
    val vm: AuthViewModel = viewModel(
        factory = viewModelFactory {
            initializer { AuthViewModel(ServiceLocator.authRepository) }
        },
    )

    when (val state = vm.uiState) {
        AuthUiState.Loading -> SplashScreen()
        AuthUiState.LoggedOut -> LoggedOutFlow(vm)
        is AuthUiState.LoggedIn -> AuthenticatedRoot(
            user = state.user,
            onLogout = vm::logout,
        )
    }
}

@Composable
private fun AuthenticatedRoot(user: AuthUser, onLogout: () -> Unit) {
    val imp = ServiceLocator.impersonation
    var showViewAs by rememberSaveable { mutableStateOf(false) }

    val context = LocalContext.current
    val notifPermLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { }
    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            notifPermLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
        PushManager.registerToken()
    }

    if (showViewAs) {
        ViewAsRoleScreen(
            onConfigured = { showViewAs = false },
            onClose = { showViewAs = false },
        )
        return
    }

    // ── Push notification routing ──
    val pendingPush = PushNavigator.pending
    val digestType = when (pendingPush?.type) {
        "daily_digest" -> "daily"
        "weekly_digest" -> "weekly"
        else -> null
    }
    if (pendingPush != null && digestType != null && pendingPush.date != null) {
        DigestDetailScreen(
            date = pendingPush.date,
            type = digestType,
            onBack = { PushNavigator.clear() },
        )
        return
    }
    // chart_alert (or anything unrouted) falls through to the tab shell; the
    // scaffold consumes it by switching to the Detections tab when present.
    val requestedTab = if (pendingPush?.type == "chart_alert") "Detections" else null
    LaunchedEffect(pendingPush) {
        // Clear pushes we can't route (unknown type, or digest without a date).
        if (pendingPush != null && requestedTab == null) PushNavigator.clear()
    }

    val effectiveRole = imp.role ?: user.role
    val displayUser = if (imp.isActive) {
        user.copy(role = effectiveRole, name = imp.displayName ?: user.name)
    } else {
        user
    }

    Column(modifier = Modifier.fillMaxSize()) {
        if (imp.isActive) {
            ImpersonationBanner(
                role = imp.role ?: "",
                name = imp.displayName ?: "",
                onStop = { imp.stop() },
            )
        }
        MainScaffold(
            user = displayUser,
            canViewAsRole = user.role.equals("ADMIN", ignoreCase = true) && !imp.isActive,
            onViewAsRole = { showViewAs = true },
            onLogout = onLogout,
            requestedTab = requestedTab,
            onTabRequestConsumed = { PushNavigator.clear() },
        )
    }
}

@Composable
private fun LoggedOutFlow(vm: AuthViewModel) {
    var screen by rememberSaveable { mutableStateOf("welcome") }
    when (screen) {
        "login" -> LoginScreen(
            vm = vm,
            onBack = { screen = "welcome"; vm.clearError() },
        )
        "register" -> RegisterFlowScreen(
            vm = vm,
            onBack = { screen = "welcome"; vm.clearError() },
        )
        else -> WelcomeScreen(
            onLogin = { screen = "login" },
            onEnterInvite = { screen = "register" },
        )
    }
}

@Composable
private fun SplashScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            music.onair.app.ui.components.HitlistWordmark(
                style = MaterialTheme.typography.headlineLarge,
            )
            Spacer(Modifier.height(20.dp))
            CircularProgressIndicator(color = RbAccent)
        }
    }
}
