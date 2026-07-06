package fm.hitlist.app.ui.theme

import androidx.compose.ui.graphics.Color

// hitlist.fm — direction "Gold Standard": amber gold on warm ink.
// Values mirror packages/tokens/tokens.json (single source of truth) exactly.
// Rules: gold only on interactive elements + at most one hero element per
// screen; the gold→ember gradient only on the primary CTA and the hero gauge;
// no radial glow backgrounds; list rows are solid surface + warm hairline border.

// Backgrounds — warm ink
val RbBackground = Color(0xFF12100E)       // warm ink app base
val RbSurface = Color(0xFF1B1714)          // solid card fill
val RbSurfaceLight = Color(0xFF26211C)     // borders / elevated fills
val RbSurfaceHighlight = Color(0xFF332B24) // selected / active row

// Accent — amber gold ("Gold Standard")
val RbAccent = Color(0xFFF5B13D)           // primary interactive
val RbAccentLight = Color(0xFFFFD588)      // light accent / big numbers
val RbAccentDark = Color(0xFFD68C24)       // gradient start / pressed

// Ember — the "hot signal": LIVE + rising + waveform detection marker (distinct from gold)
val RbWarm = Color(0xFFFF5A34)
val RbWarmLight = Color(0xFFFF8A5C)

// Text — warm greys
val RbTextPrimary = Color(0xFFF7F2E9)
val RbTextSecondary = Color(0xFFB6ADA0)
val RbTextTertiary = Color(0xFF8B8175)
val RbTextQuaternary = Color(0xFF6E655B)   // micro-labels only (>=10pt bold uppercase)

// Status
val RbLive = Color(0xFFFF5A34)             // LIVE indicator — pulsing ember
val RbSuccess = Color(0xFF47D98A)          // up-trend / positive / active
val RbError = Color(0xFFFF7A6B)            // negative/down — always pair with an icon
val RbWarning = Color(0xFFFF9F45)          // orange — PENDING status (NOT amber; amber = brand)

// Gradient stops (gold → ember "sunset") — primary CTA and hero gauge ONLY
val RbGradientStart = Color(0xFFF5B13D)
val RbGradientEnd = Color(0xFFFF5A34)

// Glass system (hero-only; warm hairline)
val RbGlassTint = Color(0x0EFFFFFF)        // white @ 5.5%
val RbGlassBorder = Color(0x1CFFFFFF)      // white @ 11%
val RbHairline = Color(0x14FFF0DC)         // warm-white @ 8%
