package music.onair.app.ui.theme

import androidx.compose.ui.graphics.Color

// onair.music — "Pulse / Violet" dark theme.
// Ported 1:1 from the iOS RadioBugTheme (apps/ios/onairMusic/Theme/RadioBugTheme.swift).
// Near-black violet base, glassy translucent cards, violet→magenta brand gradient.

// Backgrounds
val RbBackground = Color(0xFF0A070E)       // violet-tinted near-black app base
val RbSurface = Color(0xFF16121F)          // solid fallback (prefer glass card)
val RbSurfaceLight = Color(0xFF241C36)     // borders / elevated fills
val RbSurfaceHighlight = Color(0xFF2E2442) // selected / active row

// Accent — violet ("Pulse")
val RbAccent = Color(0xFF9A6DFF)           // primary interactive
val RbAccentLight = Color(0xFFC4A5FF)      // light accent text (LIVE, Premium)
val RbAccentDark = Color(0xFF7C5CF6)       // gradient start / pressed

// Secondary accent — warm coral: "detection point" marker only
val RbWarm = Color(0xFFFF6B35)
val RbWarmLight = Color(0xFFFFA06B)

// Text
val RbTextPrimary = Color(0xFFF3F1F6)
val RbTextSecondary = Color(0xFFA8A2B6)
val RbTextTertiary = Color(0xFF8E86A2)
val RbTextQuaternary = Color(0xFF726A84)   // dimmest labels / inactive tab

// Status
val RbLive = Color(0xFF34D399)             // up-trend green / "Live" dot
val RbError = Color(0xFFFF7B7B)            // softer red (Log out)
val RbWarning = Color(0xFFFBBF24)          // amber — PENDING status

// Gradient stops (violet → magenta-purple)
val RbGradientStart = Color(0xFF7C5CF6)
val RbGradientEnd = Color(0xFFB84DF0)

// Glass system (white overlays, alpha matches iOS opacities)
val RbGlassTint = Color(0x0EFFFFFF)        // white @ 5.5%
val RbGlassBorder = Color(0x1CFFFFFF)      // white @ 11%
val RbHairline = Color(0x14FFFFFF)         // white @ 8%
