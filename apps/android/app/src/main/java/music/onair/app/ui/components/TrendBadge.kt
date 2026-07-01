package music.onair.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import music.onair.app.ui.theme.RbError
import music.onair.app.ui.theme.RbLive
import music.onair.app.ui.theme.RbTextTertiary
import kotlin.math.roundToInt

/** Colored trend pill (iOS TrendBadge): up=green, down=red, flat=grey. */
@Composable
fun TrendBadge(
    direction: String,
    percentChange: Double,
    modifier: Modifier = Modifier,
) {
    val color = when (direction) {
        "up" -> RbLive
        "down" -> RbError
        else -> RbTextTertiary
    }
    val arrow = when (direction) {
        "up" -> "▲"
        "down" -> "▼"
        else -> "—"
    }
    Text(
        text = "$arrow ${percentChange.roundToInt()}%",
        style = MaterialTheme.typography.labelSmall,
        color = color,
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(color.copy(alpha = 0.14f))
            .padding(horizontal = 8.dp, vertical = 3.dp),
    )
}
