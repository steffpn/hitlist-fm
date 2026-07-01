package music.onair.app.ui.screens.settings

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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import music.onair.app.core.ServiceLocator
import music.onair.app.data.model.PreferencesSettingsResponse
import music.onair.app.ui.components.CenterError
import music.onair.app.ui.components.CenterLoading
import music.onair.app.ui.components.GlassCard
import music.onair.app.ui.components.SectionHeader
import music.onair.app.ui.theme.IbmPlexMono
import music.onair.app.ui.theme.RbAccent
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbError
import music.onair.app.ui.theme.RbSurfaceLight
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.theme.RbTextTertiary

private val mono = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp)

@Composable
fun PreferencesScreen(onBack: () -> Unit) {
    val vm: PreferencesViewModel = viewModel(
        factory = viewModelFactory { initializer { PreferencesViewModel(ServiceLocator.api) } },
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
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
            text = "Notifications & Reports",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 4.dp),
        )
        Text(
            text = "Choose which digests and alerts you receive",
            style = MaterialTheme.typography.bodyMedium,
            color = RbTextSecondary,
            modifier = Modifier.padding(horizontal = 20.dp),
        )

        Spacer(Modifier.height(18.dp))

        val d = vm.data
        when {
            vm.isLoading && d == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) { CenterLoading() }
            vm.error != null && d == null ->
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    CenterError(message = vm.error ?: "Error", onRetry = { vm.refresh() })
                }
            d != null -> {
                val updateError = vm.updateError
                if (updateError != null) {
                    Text(
                        text = updateError,
                        style = MaterialTheme.typography.bodySmall,
                        color = RbError,
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
                    )
                    Spacer(Modifier.height(8.dp))
                }

                SectionHeader("Daily report", modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(Modifier.height(10.dp))
                GlassCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
                    ToggleRow(
                        title = "Daily report",
                        subtitle = "A summary of your airplay each morning",
                        checked = d.dailyReportEnabled,
                        onCheckedChange = vm::onDailyReportEnabledChange,
                    )
                    if (d.dailyReportEnabled) {
                        Spacer(Modifier.height(12.dp))
                        InfoRow(label = "Delivery time", value = d.dailyReportTime)
                        Spacer(Modifier.height(8.dp))
                        InfoRow(label = "Timezone", value = d.dailyReportTimezone)
                    }
                }

                Spacer(Modifier.height(24.dp))
                SectionHeader("Chart alerts", modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(Modifier.height(10.dp))
                GlassCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
                    ToggleRow(
                        title = "Chart alerts",
                        subtitle = "Notify me when a tracked song enters the charts",
                        checked = d.chartAlertsEnabled,
                        onCheckedChange = vm::onChartAlertsEnabledChange,
                    )
                    val countries = d.chartAlertCountries
                    if (d.chartAlertsEnabled && countries.isNotEmpty()) {
                        Spacer(Modifier.height(12.dp))
                        InfoRow(label = "Countries", value = countries.joinToString(", "))
                    }
                }
            }
        }
    }
}

@Composable
private fun ToggleRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                color = RbTextPrimary,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = RbTextSecondary,
            )
        }
        Spacer(Modifier.width(12.dp))
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = RbTextPrimary,
                checkedTrackColor = RbAccent,
                uncheckedThumbColor = RbTextTertiary,
                uncheckedTrackColor = RbSurfaceLight,
                uncheckedBorderColor = RbSurfaceLight,
            ),
        )
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = RbTextTertiary,
            modifier = Modifier.weight(1f),
        )
        Text(
            text = value,
            style = mono,
            color = RbTextPrimary,
        )
    }
}
