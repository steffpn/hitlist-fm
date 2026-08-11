package fm.hitlist.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fm.hitlist.app.data.model.SongStationBreakdownItem
import fm.hitlist.app.ui.theme.IbmPlexMono
import fm.hitlist.app.ui.theme.RbAccent
import fm.hitlist.app.ui.theme.RbSurfaceLight
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextSecondary

private val mono = TextStyle(fontFamily = IbmPlexMono, fontSize = 12.sp)

/**
 * Plays per station as proportional bars.
 *
 * Lives here rather than inside one screen because both the song analytics view
 * and the artist dashboard show it — the dashboard previously reported only a
 * combined total, so there was no way to tell which station carried a track.
 */
@Composable
fun StationBreakdown(
    items: List<SongStationBreakdownItem>,
    modifier: Modifier = Modifier,
) {
    val maxCount = (items.maxOfOrNull { it.playCount } ?: 0).coerceAtLeast(1)
    Column(modifier.fillMaxWidth()) {
        items.forEachIndexed { index, item ->
            if (index > 0) Spacer(Modifier.height(12.dp))
            StationBreakdownRow(item = item, maxCount = maxCount)
        }
    }
}

@Composable
private fun StationBreakdownRow(item: SongStationBreakdownItem, maxCount: Int) {
    Column(Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = item.stationName,
                style = MaterialTheme.typography.bodyMedium,
                color = RbTextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(10.dp))
            Text(text = "${item.playCount}", style = mono, color = RbTextSecondary)
        }
        Spacer(Modifier.height(6.dp))
        // Floor the fraction so a station with a single play still shows a sliver.
        val fraction = (item.playCount.toFloat() / maxCount.toFloat()).coerceIn(0.02f, 1f)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(RbSurfaceLight),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(fraction)
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(RbAccent),
            )
        }
    }
}
