package music.onair.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import music.onair.app.ui.theme.RbGlassBorder
import music.onair.app.ui.theme.RbSurface

/** Glassy card, ported from the iOS RBCardStyle (subtle lighter fill + hairline border). */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    padding: Dp = 16.dp,
    cornerRadius: Dp = 20.dp,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(cornerRadius))
            .background(RbSurface)
            .border(1.dp, RbGlassBorder, RoundedCornerShape(cornerRadius))
            .padding(padding),
        content = content,
    )
}
