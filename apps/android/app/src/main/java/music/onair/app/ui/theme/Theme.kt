package music.onair.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val OnairColorScheme = darkColorScheme(
    primary = RbAccent,
    onPrimary = Color.White,
    primaryContainer = RbAccentDark,
    onPrimaryContainer = RbTextPrimary,
    secondary = RbAccentLight,
    onSecondary = Color.White,
    tertiary = RbWarm,
    background = RbBackground,
    onBackground = RbTextPrimary,
    surface = RbSurface,
    onSurface = RbTextPrimary,
    surfaceVariant = RbSurfaceLight,
    onSurfaceVariant = RbTextSecondary,
    error = RbError,
    onError = Color.White,
    outline = RbTextQuaternary,
    outlineVariant = RbSurfaceLight,
)

@Composable
fun OnairTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = OnairColorScheme,
        typography = OnairTypography,
        content = content,
    )
}
