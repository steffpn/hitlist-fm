package fm.hitlist.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import fm.hitlist.app.ui.theme.RbAccent
import fm.hitlist.app.ui.theme.RbSurface
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextTertiary

/** Analytics period, matching the backend's `period` query values. */
enum class Period(val label: String, val value: String) {
    DAY("Day", "day"),
    WEEK("Week", "week"),
    MONTH("Month", "month"),
}

/** Segmented Day/Week/Month picker used across analytics screens. */
@Composable
fun PeriodPicker(
    selected: Period,
    onSelect: (Period) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(RbSurface)
            .padding(3.dp),
    ) {
        Period.entries.forEach { period ->
            val isSelected = period == selected
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(if (isSelected) RbAccent else Color.Transparent)
                    .clickable { onSelect(period) }
                    .padding(horizontal = 18.dp, vertical = 8.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = period.label,
                    style = MaterialTheme.typography.labelLarge,
                    color = if (isSelected) Color.White else RbTextTertiary,
                )
            }
        }
    }
}
