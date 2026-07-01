package music.onair.app.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import music.onair.app.core.ServiceLocator
import music.onair.app.ui.components.CenterError
import music.onair.app.ui.components.CenterLoading
import music.onair.app.ui.components.GlassCard
import music.onair.app.ui.components.SectionHeader
import music.onair.app.ui.theme.IbmPlexMono
import music.onair.app.ui.theme.RbAccent
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbError
import music.onair.app.ui.theme.RbSurface
import music.onair.app.ui.theme.RbSurfaceHighlight
import music.onair.app.ui.theme.RbSurfaceLight
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.theme.RbTextTertiary

private val mono = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp)

// Short curated list — Europe/Bucharest first (product default), then common zones.
private val TIMEZONES = listOf(
    "Europe/Bucharest",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Madrid",
    "Europe/Rome",
    "Europe/Athens",
    "Europe/Chisinau",
    "America/New_York",
    "America/Los_Angeles",
    "UTC",
)

// ISO country codes offered for chart alerts (server expects 2-letter codes).
private val CHART_COUNTRIES = listOf("RO", "MD", "GB", "US", "DE", "FR", "ES", "IT", "NL", "PL")

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun PreferencesScreen(onBack: () -> Unit) {
    val vm: PreferencesViewModel = viewModel(
        factory = viewModelFactory { initializer { PreferencesViewModel(ServiceLocator.api) } },
    )

    var showTimePicker by remember { mutableStateOf(false) }
    var timezoneMenuOpen by remember { mutableStateOf(false) }

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
                        EditableRow(
                            label = "Delivery time",
                            value = d.dailyReportTime,
                            onClick = { showTimePicker = true },
                        )
                        Spacer(Modifier.height(8.dp))
                        Box {
                            EditableRow(
                                label = "Timezone",
                                value = d.dailyReportTimezone,
                                onClick = { timezoneMenuOpen = true },
                            )
                            DropdownMenu(
                                expanded = timezoneMenuOpen,
                                onDismissRequest = { timezoneMenuOpen = false },
                                containerColor = RbSurfaceHighlight,
                            ) {
                                val zones = if (d.dailyReportTimezone in TIMEZONES) {
                                    TIMEZONES
                                } else {
                                    listOf(d.dailyReportTimezone) + TIMEZONES
                                }
                                zones.forEach { zone ->
                                    DropdownMenuItem(
                                        text = {
                                            Text(
                                                text = zone,
                                                color = if (zone == d.dailyReportTimezone) RbAccent else RbTextPrimary,
                                            )
                                        },
                                        onClick = {
                                            timezoneMenuOpen = false
                                            if (zone != d.dailyReportTimezone) vm.onTimezoneChange(zone)
                                        },
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(Modifier.height(24.dp))
                SectionHeader("Weekly report", modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(Modifier.height(10.dp))
                GlassCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
                    ToggleRow(
                        title = "Weekly report",
                        subtitle = "Week-over-week recap every Monday",
                        checked = d.weeklyReportEnabled,
                        onCheckedChange = vm::onWeeklyReportEnabledChange,
                    )
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
                    if (d.chartAlertsEnabled) {
                        Spacer(Modifier.height(12.dp))
                        Text(
                            text = "Countries",
                            style = MaterialTheme.typography.bodyMedium,
                            color = RbTextTertiary,
                        )
                        Spacer(Modifier.height(6.dp))
                        // Multi-select country chips; current selections always shown.
                        val options = (CHART_COUNTRIES + d.chartAlertCountries).distinct()
                        FlowRow(
                            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp),
                        ) {
                            options.forEach { country ->
                                val selected = country in d.chartAlertCountries
                                FilterChip(
                                    selected = selected,
                                    onClick = { vm.toggleChartAlertCountry(country) },
                                    label = { Text(country, style = mono) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        containerColor = RbSurfaceLight,
                                        labelColor = RbTextSecondary,
                                        selectedContainerColor = RbAccent.copy(alpha = 0.22f),
                                        selectedLabelColor = RbAccent,
                                    ),
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // ── Time picker dialog (M3 TimePicker in an AlertDialog) ──
    if (showTimePicker) {
        val current = vm.data?.dailyReportTime ?: "08:00"
        val initialHour = current.substringBefore(':').toIntOrNull()?.coerceIn(0, 23) ?: 8
        val initialMinute = current.substringAfter(':').toIntOrNull()?.coerceIn(0, 59) ?: 0
        val timeState = rememberTimePickerState(
            initialHour = initialHour,
            initialMinute = initialMinute,
            is24Hour = true,
        )
        AlertDialog(
            onDismissRequest = { showTimePicker = false },
            containerColor = RbSurface,
            title = { Text("Daily report time", color = RbTextPrimary) },
            text = { TimePicker(state = timeState) },
            confirmButton = {
                TextButton(
                    onClick = {
                        val formatted = "%02d:%02d".format(timeState.hour, timeState.minute)
                        vm.onDailyReportTimeChange(formatted)
                        showTimePicker = false
                    },
                ) { Text("Save", color = RbAccent) }
            },
            dismissButton = {
                TextButton(onClick = { showTimePicker = false }) {
                    Text("Cancel", color = RbTextTertiary)
                }
            },
        )
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

/** Tappable label/value row (opens a picker). */
@Composable
private fun EditableRow(label: String, value: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
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
            color = RbAccent,
        )
        Icon(
            imageVector = Icons.Filled.ArrowDropDown,
            contentDescription = null,
            tint = RbTextTertiary,
        )
    }
}
