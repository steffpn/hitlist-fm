package music.onair.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import music.onair.app.R

// Sora — UI typeface (bundled from the iOS app's Resources/Fonts).
// sora.ttf is a VARIABLE font: without explicit FontVariation.Settings every
// weight falls back to the default instance (400), flattening the type
// hierarchy. Each Font() below pins the `wght` axis to its declared weight.
@OptIn(ExperimentalTextApi::class)
private fun soraFont(weight: FontWeight) = Font(
    R.font.sora,
    weight = weight,
    variationSettings = FontVariation.Settings(FontVariation.weight(weight.weight)),
)

val Sora = FontFamily(
    soraFont(FontWeight.Normal),    // wght 400
    soraFont(FontWeight.Medium),    // wght 500
    soraFont(FontWeight.SemiBold),  // wght 600
    soraFont(FontWeight.Bold),      // wght 700
    soraFont(FontWeight.ExtraBold), // wght 800
)

// IBM Plex Mono — timestamps / ISRC / play counts.
val IbmPlexMono = FontFamily(
    Font(R.font.ibm_plex_mono, FontWeight.Normal),
    Font(R.font.ibm_plex_mono_medium, FontWeight.Medium),
)

val OnairTypography = Typography(
    displayLarge = TextStyle(fontFamily = Sora, fontWeight = FontWeight.ExtraBold, fontSize = 34.sp),
    displayMedium = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Bold, fontSize = 28.sp),
    headlineLarge = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Bold, fontSize = 26.sp),
    headlineMedium = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = 22.sp),
    headlineSmall = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = 19.sp),
    titleLarge = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = 18.sp),
    titleMedium = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Medium, fontSize = 16.sp),
    titleSmall = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Medium, fontSize = 14.sp),
    bodyLarge = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = 16.sp),
    bodyMedium = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = 14.sp),
    bodySmall = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = 12.sp),
    labelLarge = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = 14.sp),
    labelMedium = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Medium, fontSize = 12.sp),
    labelSmall = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Medium, fontSize = 11.sp),
)
