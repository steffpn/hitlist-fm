package music.onair.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import music.onair.app.ui.theme.RbAccent
import music.onair.app.ui.theme.RbAccentLight
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbGradientEnd
import music.onair.app.ui.theme.RbGradientStart
import music.onair.app.ui.theme.RbTextPrimary

/** hitlist + .fm(gold) wordmark. The `.fm` is the only place the brand color
 *  touches the name; `hitlist` stays warm white. */
@Composable
fun HitlistWordmark(
    modifier: Modifier = Modifier,
    style: TextStyle = MaterialTheme.typography.displayLarge,
) {
    Text(
        modifier = modifier,
        style = style,
        text = buildAnnotatedString {
            withStyle(SpanStyle(color = RbTextPrimary)) { append("hitlist") }
            withStyle(SpanStyle(color = RbAccent)) { append(".fm") }
        },
    )
}

/** hitlist.fm rotation-gauge brand mark, drawn on-dark. Geometry mirrors
 *  design_handoff_hitlist_fm/logo/mark.svg (viewBox 120, center 60,60). */
@Composable
fun HitlistMark(size: Dp = 96.dp, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.size(size)) {
        val s = this.size.minDimension
        fun d(v: Float) = s * v / 120f
        val c = Offset(s / 2f, s / 2f)
        val r = d(52f)
        val arcTopLeft = Offset(c.x - r, c.y - r)
        val arcSize = Size(r * 2f, r * 2f)

        // Base ring
        drawCircle(color = Color(0x1AFFF0DC), radius = r, center = c, style = Stroke(width = d(2f)))
        // Dotted tick ring
        drawCircle(
            color = RbAccent.copy(alpha = 0.32f),
            radius = d(43f),
            center = c,
            style = Stroke(
                width = d(2.5f),
                cap = StrokeCap.Round,
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(d(1f), d(8f)), 0f),
            ),
        )
        // Gauge track — faint 270° arc, gap at bottom
        drawArc(
            color = Color(0x14FFF0DC),
            startAngle = 135f,
            sweepAngle = 270f,
            useCenter = false,
            topLeft = arcTopLeft,
            size = arcSize,
            style = Stroke(width = d(6f), cap = StrokeCap.Round),
        )
        // Gauge fill — gold→ember, ~78% of the arc
        drawArc(
            brush = Brush.linearGradient(
                colors = listOf(RbGradientStart, RbGradientEnd),
                start = arcTopLeft,
                end = Offset(arcTopLeft.x + r * 2f, arcTopLeft.y + r * 2f),
            ),
            startAngle = 135f,
            sweepAngle = 270f * 0.78f,
            useCenter = false,
            topLeft = arcTopLeft,
            size = arcSize,
            style = Stroke(width = d(6f), cap = StrokeCap.Round),
        )
        // Needle — center → (93,41)
        drawLine(
            color = RbAccentLight,
            start = c,
            end = Offset(d(93f), d(41f)),
            strokeWidth = d(4f),
            cap = StrokeCap.Round,
        )
        // Hub — gold disc + ink pupil
        drawCircle(color = RbAccent, radius = d(8f), center = c)
        drawCircle(color = RbBackground, radius = d(3.4f), center = c)
    }
}
