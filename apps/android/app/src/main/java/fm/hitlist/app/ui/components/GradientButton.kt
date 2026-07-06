package fm.hitlist.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.unit.dp
import fm.hitlist.app.ui.theme.RbBackground
import fm.hitlist.app.ui.theme.RbGradientEnd
import fm.hitlist.app.ui.theme.RbGradientStart
import fm.hitlist.app.ui.theme.RbSurfaceLight

/** Primary CTA — gold→ember "sunset" capsule with INK label (mirrors iOS
 *  RBAccentButtonStyle; the gradient's gold end is too light for white text). */
@Composable
fun GradientButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    val shape = RoundedCornerShape(27.dp)
    val fill: Brush = if (enabled) {
        Brush.linearGradient(
            colors = listOf(RbGradientStart, RbGradientEnd),
            start = Offset(0f, 0f),
            end = Offset(1000f, 220f),
        )
    } else {
        SolidColor(RbSurfaceLight)
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(54.dp)
            .clip(shape)
            .background(fill)
            .clickable(enabled = enabled && !loading, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                color = RbBackground,
                strokeWidth = 2.dp,
            )
        } else {
            Text(
                text = text,
                style = MaterialTheme.typography.labelLarge,
                color = RbBackground,
            )
        }
    }
}
