package fm.hitlist.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DragHandle
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import fm.hitlist.app.ui.theme.RbAccent
import fm.hitlist.app.ui.theme.RbBackground
import fm.hitlist.app.ui.theme.RbSurface
import fm.hitlist.app.ui.theme.RbSurfaceLight
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextTertiary

private val ROW_HEIGHT = 52.dp

/**
 * Long-press-and-drag list for reordering a short, fixed set of items.
 *
 * A dialog rather than making the dashboard itself a drag surface: the cards stay
 * scrollable and tappable, and rearranging is an explicit act. Compose has no
 * built-in reorderable list, and for half a dozen fixed-height rows the index
 * arithmetic here is far less machinery than pulling in a dependency.
 */
@Composable
fun <T> ReorderDialog(
    title: String,
    items: List<T>,
    label: (T) -> String,
    onDismiss: () -> Unit,
    onConfirm: (List<T>) -> Unit,
) {
    var order by remember(items) { mutableStateOf(items) }
    var draggingIndex by remember { mutableStateOf<Int?>(null) }
    var dragOffset by remember { mutableStateOf(0f) }
    val rowHeightPx = with(LocalDensity.current) { ROW_HEIGHT.toPx() }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = RbBackground,
        title = { Text(title, color = RbTextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = "Press and hold a row, then drag it.",
                    style = MaterialTheme.typography.bodySmall,
                    color = RbTextTertiary,
                    modifier = Modifier.padding(bottom = 6.dp),
                )
                order.forEachIndexed { index, item ->
                    val isDragging = draggingIndex == index
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(ROW_HEIGHT)
                            .graphicsLayer {
                                translationY = if (isDragging) dragOffset else 0f
                                // Lift the dragged row above its neighbours.
                                shadowElevation = if (isDragging) 8f else 0f
                            }
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (isDragging) RbSurfaceLight else RbSurface)
                            .padding(horizontal = 12.dp)
                            .pointerInput(order, index) {
                                detectDragGesturesAfterLongPress(
                                    onDragStart = {
                                        draggingIndex = index
                                        dragOffset = 0f
                                    },
                                    onDrag = { change, amount ->
                                        change.consume()
                                        dragOffset += amount.y
                                        // Swap as soon as the row has travelled past
                                        // its neighbour's midpoint.
                                        val steps = (dragOffset / rowHeightPx).toInt()
                                        if (steps != 0) {
                                            val from = draggingIndex ?: return@detectDragGesturesAfterLongPress
                                            val to = (from + steps).coerceIn(0, order.lastIndex)
                                            if (to != from) {
                                                order = order.toMutableList().apply {
                                                    add(to, removeAt(from))
                                                }
                                                draggingIndex = to
                                                dragOffset -= steps * rowHeightPx
                                            }
                                        }
                                    },
                                    onDragEnd = {
                                        draggingIndex = null
                                        dragOffset = 0f
                                    },
                                    onDragCancel = {
                                        draggingIndex = null
                                        dragOffset = 0f
                                    },
                                )
                            },
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.DragHandle,
                            contentDescription = null,
                            tint = if (isDragging) RbAccent else RbTextTertiary,
                        )
                        Text(
                            text = label(item),
                            style = MaterialTheme.typography.bodyMedium,
                            color = RbTextPrimary,
                            modifier = Modifier.padding(start = 10.dp),
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(order) }) { Text("Done", color = RbAccent) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel", color = RbTextTertiary) }
        },
    )
}
