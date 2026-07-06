package fm.hitlist.app.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
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
import fm.hitlist.app.data.model.SubscriptionBillingInfo
import fm.hitlist.app.data.model.SubscriptionInfoResponse
import fm.hitlist.app.data.model.SubscriptionPlanInfo
import fm.hitlist.app.ui.components.CenterError
import fm.hitlist.app.ui.components.CenterLoading
import fm.hitlist.app.ui.components.GlassCard
import fm.hitlist.app.ui.components.GradientButton
import fm.hitlist.app.ui.components.SectionHeader
import fm.hitlist.app.ui.theme.IbmPlexMono
import fm.hitlist.app.ui.theme.RbAccentLight
import fm.hitlist.app.ui.theme.RbBackground
import fm.hitlist.app.ui.theme.RbSuccess
import fm.hitlist.app.ui.theme.RbSurfaceLight
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextSecondary
import fm.hitlist.app.ui.theme.RbTextTertiary
import fm.hitlist.app.ui.theme.RbWarning

private val monoSmall = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp)

@Composable
fun SubscriptionScreen(role: String, onBack: () -> Unit) {
    val vm: SubscriptionViewModel = viewModel(
        factory = viewModelFactory { initializer { SubscriptionViewModel(ServiceLocator.api) } },
    )
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }

    // Open the Stripe Checkout URL in Chrome Custom Tabs.
    LaunchedEffect(vm.checkoutUrl) {
        val url = vm.checkoutUrl ?: return@LaunchedEffect
        vm.consumeCheckoutUrl()
        try {
            CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url))
        } catch (_: Exception) {
            snackbarHostState.showSnackbar("Couldn't open the checkout page.")
        }
    }

    // 503 "Billing not configured" and friends → visible snackbar, button never feels dead.
    LaunchedEffect(vm.checkoutMessage) {
        val message = vm.checkoutMessage ?: return@LaunchedEffect
        vm.consumeCheckoutMessage()
        snackbarHostState.showSnackbar(message)
    }

    Box(Modifier.fillMaxSize().background(RbBackground)) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(bottom = 24.dp),
        ) {
            IconButton(onClick = onBack, modifier = Modifier.padding(4.dp)) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = RbTextPrimary,
                )
            }

            Text(
                text = "Plan & Billing",
                style = MaterialTheme.typography.headlineLarge,
                color = RbTextPrimary,
                modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 12.dp),
            )

            val data = vm.data
            when {
                vm.isLoading && data == null ->
                    Box(Modifier.fillMaxWidth().height(300.dp)) { CenterLoading() }
                vm.error != null && data == null ->
                    Box(Modifier.fillMaxWidth().height(300.dp)) {
                        CenterError(message = vm.error ?: "Error", onRetry = { vm.refresh() })
                    }
                data != null -> SubscriptionContent(
                    data = data,
                    isCheckingOut = vm.isCheckingOut,
                    onUpgrade = { vm.upgrade(role) },
                )
            }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter),
        )
    }
}

@Composable
private fun SubscriptionContent(
    data: SubscriptionInfoResponse,
    isCheckingOut: Boolean,
    onUpgrade: () -> Unit,
) {
    val subscription = data.subscription
    val plan = data.plan

    if (subscription == null) {
        FreePlanCard(plan, isCheckingOut = isCheckingOut, onUpgrade = onUpgrade)
    } else {
        ActiveSubscriptionCard(subscription, plan)
    }

    if (data.features.isNotEmpty()) {
        Spacer(Modifier.height(20.dp))
        SectionHeader(text = "What's included")
        Spacer(Modifier.height(8.dp))
        FeaturesCard(data.features)
    }
}

@Composable
private fun FreePlanCard(
    plan: SubscriptionPlanInfo?,
    isCheckingOut: Boolean,
    onUpgrade: () -> Unit,
) {
    GlassCard(modifier = Modifier.padding(horizontal = 20.dp)) {
        Text(
            text = plan?.name?.takeIf { it.isNotBlank() } ?: "Free plan",
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
            color = RbTextPrimary,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = "You're on the free plan. Upgrade to unlock more monitoring and analytics.",
            style = MaterialTheme.typography.bodyMedium,
            color = RbTextSecondary,
        )
        Spacer(Modifier.height(16.dp))
        GradientButton(
            text = "Upgrade plan",
            onClick = onUpgrade,
            loading = isCheckingOut,
        )
    }
}

@Composable
private fun ActiveSubscriptionCard(
    subscription: SubscriptionBillingInfo,
    plan: SubscriptionPlanInfo?,
) {
    GlassCard(modifier = Modifier.padding(horizontal = 20.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = plan?.name?.takeIf { it.isNotBlank() } ?: "Current plan",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = RbTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                plan?.tier?.takeIf { it.isNotBlank() }?.let { tier ->
                    Text(
                        text = tier.uppercase(),
                        style = monoSmall,
                        color = RbAccentLight,
                    )
                }
            }
            Spacer(Modifier.width(12.dp))
            StatusPill(subscription.status)
        }

        Spacer(Modifier.height(16.dp))

        DetailRow(
            label = "Billing",
            value = billingLabel(subscription.billingInterval),
        )
        subscription.trialEndsAt?.takeIf { it.isNotBlank() }?.let {
            Spacer(Modifier.height(10.dp))
            DetailRow(label = "Trial ends", value = DateFormat.shortDateTime(it))
        }
        subscription.currentPeriodEnd?.takeIf { it.isNotBlank() }?.let {
            Spacer(Modifier.height(10.dp))
            DetailRow(
                label = if (subscription.cancelAtPeriodEnd) "Access until" else "Renews",
                value = DateFormat.shortDateTime(it),
            )
        }
        if (subscription.seatCount > 0) {
            Spacer(Modifier.height(10.dp))
            DetailRow(label = "Seats", value = subscription.seatCount.toString())
        }

        if (subscription.cancelAtPeriodEnd) {
            Spacer(Modifier.height(16.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(RbSurfaceLight)
                    .padding(12.dp),
            ) {
                Text(
                    text = "Your subscription is set to cancel at the end of the current period.",
                    style = MaterialTheme.typography.bodySmall,
                    color = RbWarning,
                )
            }
        }
    }
}

@Composable
private fun FeaturesCard(features: List<String>) {
    GlassCard(modifier = Modifier.padding(horizontal = 20.dp)) {
        features.forEachIndexed { index, feature ->
            if (index > 0) Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(RbAccentLight),
                )
                Spacer(Modifier.width(10.dp))
                Text(
                    text = featureLabel(feature),
                    style = MaterialTheme.typography.bodyMedium,
                    color = RbTextSecondary,
                )
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = RbTextTertiary,
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
            color = RbTextPrimary,
        )
    }
}

@Composable
private fun StatusPill(status: String) {
    val normalized = status.lowercase()
    val color = when (normalized) {
        "active" -> RbSuccess
        "trialing" -> RbAccentLight
        else -> RbWarning
    }
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(color.copy(alpha = 0.15f))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(
            text = statusLabel(status),
            style = monoSmall,
            color = color,
        )
    }
}

private fun statusLabel(status: String): String =
    status.takeIf { it.isNotBlank() }
        ?.replace('_', ' ')
        ?.replaceFirstChar { it.uppercase() }
        ?: "Unknown"

private fun billingLabel(interval: String): String = when (interval.lowercase()) {
    "annual", "yearly", "year" -> "Annual"
    "monthly", "month" -> "Monthly"
    "" -> "—"
    else -> interval.replaceFirstChar { it.uppercase() }
}

private fun featureLabel(key: String): String =
    key.replace('_', ' ')
        .replace('-', ' ')
        .split(' ')
        .filter { it.isNotBlank() }
        .joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
        .ifBlank { key }
