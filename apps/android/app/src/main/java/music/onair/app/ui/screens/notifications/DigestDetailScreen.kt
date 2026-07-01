package music.onair.app.ui.screens.notifications

import androidx.activity.compose.BackHandler
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import music.onair.app.core.ServiceLocator
import music.onair.app.data.model.DigestDetail
import music.onair.app.ui.components.CenterError
import music.onair.app.ui.components.CenterLoading
import music.onair.app.ui.components.GlassCard
import music.onair.app.ui.theme.IbmPlexMono
import music.onair.app.ui.theme.RbAccentLight
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbError
import music.onair.app.ui.theme.RbSuccess
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.theme.RbTextTertiary

private val monoValue = TextStyle(fontFamily = IbmPlexMono, fontSize = 26.sp, fontWeight = FontWeight.Bold)

/**
 * Opened from a daily/weekly digest push notification.
 * Loads GET /notifications/digest/:date?type= and shows the stored summary.
 */
@Composable
fun DigestDetailScreen(
    date: String,
    type: String, // "daily" | "weekly"
    onBack: () -> Unit,
) {
    var detail by remember { mutableStateOf<DigestDetail?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadTick by remember { mutableStateOf(0) }

    LaunchedEffect(date, type, reloadTick) {
        isLoading = true
        error = null
        try {
            detail = ServiceLocator.api.getDigestDetail(date, type)
        } catch (e: Exception) {
            error = e.message ?: "No report found for $date"
        } finally {
            isLoading = false
        }
    }

    BackHandler { onBack() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 24.dp),
    ) {
        IconButton(onClick = onBack, modifier = Modifier.padding(4.dp)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = RbTextPrimary)
        }

        Text(
            text = if (type == "weekly") "Weekly digest" else "Daily digest",
            style = MaterialTheme.typography.headlineLarge,
            color = RbTextPrimary,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 2.dp),
        )
        Text(
            text = date,
            style = TextStyle(fontFamily = IbmPlexMono, fontSize = 13.sp),
            color = RbTextTertiary,
            modifier = Modifier.padding(horizontal = 20.dp),
        )

        Spacer(Modifier.height(18.dp))

        val d = detail
        when {
            isLoading -> Box(Modifier.fillMaxWidth().height(280.dp)) { CenterLoading() }
            error != null -> Box(Modifier.fillMaxWidth().height(280.dp)) {
                CenterError(message = error ?: "Error", onRetry = { reloadTick++ })
            }
            d != null -> Column(
                modifier = Modifier.padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Text("TOTAL PLAYS", style = MaterialTheme.typography.labelSmall, color = RbTextTertiary)
                    Spacer(Modifier.height(4.dp))
                    Text("${d.playCount}", style = monoValue, color = RbAccentLight)
                }

                d.topSong?.let { top ->
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Text("TOP SONG", style = MaterialTheme.typography.labelSmall, color = RbTextTertiary)
                        Spacer(Modifier.height(6.dp))
                        Row {
                            Column(Modifier.weight(1f)) {
                                Text(
                                    text = top.title,
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                                    color = RbTextPrimary,
                                )
                                top.artist?.let {
                                    Text(it, style = MaterialTheme.typography.bodySmall, color = RbTextSecondary)
                                }
                            }
                            Spacer(Modifier.width(10.dp))
                            Text(
                                text = "${top.count} plays",
                                style = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp),
                                color = RbAccentLight,
                            )
                        }
                    }
                }

                d.topStation?.let { top ->
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Text("TOP STATION", style = MaterialTheme.typography.labelSmall, color = RbTextTertiary)
                        Spacer(Modifier.height(6.dp))
                        Row {
                            Text(
                                text = top.name ?: top.title,
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                                color = RbTextPrimary,
                                modifier = Modifier.weight(1f),
                            )
                            Text(
                                text = "${top.count} plays",
                                style = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp),
                                color = RbAccentLight,
                            )
                        }
                    }
                }

                d.weekOverWeekChange?.let { change ->
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Text("WEEK OVER WEEK", style = MaterialTheme.typography.labelSmall, color = RbTextTertiary)
                        Spacer(Modifier.height(4.dp))
                        val positive = change >= 0
                        Text(
                            text = (if (positive) "+" else "") + "%.1f%%".format(change),
                            style = monoValue,
                            color = if (positive) RbSuccess else RbError,
                        )
                    }
                }

                d.newStationsCount?.let { count ->
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Text("NEW STATIONS", style = MaterialTheme.typography.labelSmall, color = RbTextTertiary)
                        Spacer(Modifier.height(4.dp))
                        Text("$count", style = monoValue, color = RbTextPrimary)
                    }
                }
            }
        }
    }
}
