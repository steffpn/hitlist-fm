package music.onair.app.ui.theme

import androidx.compose.ui.graphics.Color

// onair.music — direction A "ON AIR": broadcast red on warm black.
// Values mirror packages/tokens/tokens.json (single source of truth) exactly.
// Rules: accent only on interactive elements + at most one hero element per
// screen; gradient only on the primary CTA and the hero gauge; no radial glow
// backgrounds; list rows are solid surface + 8% white hairline border.

// Backgrounds
val RbBackground = Color(0xFF0B0A0A)       // warm near-black app base
val RbSurface = Color(0xFF151313)          // solid card fill
val RbSurfaceLight = Color(0xFF232020)     // borders / elevated fills
val RbSurfaceHighlight = Color(0xFF2D2827) // selected / active row

// Accent — broadcast red ("ON AIR")
val RbAccent = Color(0xFFFF4B45)           // primary interactive
val RbAccentLight = Color(0xFFFF8A80)      // light accent text
val RbAccentDark = Color(0xFFD92D26)       // gradient start / pressed

// Secondary accent — amber: "detection point" marker only (distinct from brand red)
val RbWarm = Color(0xFFFFC53D)
val RbWarmLight = Color(0xFFFFD98A)

// Text
val RbTextPrimary = Color(0xFFF5F3F2)
val RbTextSecondary = Color(0xFFABA4A2)
val RbTextTertiary = Color(0xFF8E8886)
val RbTextQuaternary = Color(0xFF827C7A)   // micro-labels only (>=10pt bold uppercase)

// Status
val RbLive = Color(0xFFFF4B45)             // LIVE indicator — pulsing broadcast red
val RbSuccess = Color(0xFF30D158)          // up-trend / positive / active
val RbError = Color(0xFFFF8A80)            // sits close to brand red — always pair with an icon
val RbWarning = Color(0xFFFFC53D)          // amber — PENDING status

// Gradient stops (dark red → broadcast red) — primary CTA and hero gauge ONLY
val RbGradientStart = Color(0xFFD92D26)
val RbGradientEnd = Color(0xFFFF4B45)

// Glass system (white overlays, alpha matches iOS opacities)
val RbGlassTint = Color(0x0EFFFFFF)        // white @ 5.5%
val RbGlassBorder = Color(0x1CFFFFFF)      // white @ 11%
val RbHairline = Color(0x14FFFFFF)         // white @ 8%
