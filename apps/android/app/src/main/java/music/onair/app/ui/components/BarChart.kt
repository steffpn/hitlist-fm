package music.onair.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import music.onair.app.ui.theme.IbmPlexMono
import music.onair.app.ui.theme.RbAccent
import music.onair.app.ui.theme.RbAccentLight
import music.onair.app.ui.theme.RbTextTertiary

private val axisLabelStyle = TextStyle(fontFamily = IbmPlexMono, fontSize = 9.sp)

/**
 * Vertical bar chart with flat accent bars (ported from iOS BarChartView).
 * Highlighted indices use the light accent; caller controls x-axis labels.
 * Flat per tokens rule: gradient is reserved for the primary CTA and the gauge.
 */
@Composable
fun BarChart(
    values: List<Float>,
    labels: List<String>,
    modifier: Modifier = Modifier,
    highlight: Set<Int> = emptySet(),
    barsHeight: Dp = 160.dp,
) {
    val max = (values.maxOrNull() ?: 0f).coerceAtLeast(1f)
    val topShape = RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp)

    Column(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(barsHeight),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            values.forEachIndexed { index, value ->
                val fraction = (value / max).coerceIn(0.02f, 1f)
                val color = if (index in highlight) RbAccentLight else RbAccent
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight(fraction)
                        .clip(topShape)
                        .background(color),
                )
            }
        }

        if (labels.isNotEmpty()) {
            Spacer(Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                labels.forEach { label ->
                    Text(
                        text = label,
                        style = axisLabelStyle,
                        color = RbTextTertiary,
                        textAlign = TextAlign.Center,
                        maxLines = 1,
                        overflow = TextOverflow.Clip,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}
