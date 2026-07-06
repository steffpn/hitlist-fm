import SwiftUI

// hitlist.fm — direction "Gold Standard": amber gold on warm ink.
// Source of truth: packages/tokens/tokens.json — values here must mirror it exactly.
// Token NAMES are unchanged from the old ON AIR theme so no call sites break;
// only the hex values changed (broadcast red → amber gold).
extension Color {
    // Backgrounds — warm ink
    static let rbBackground = Color(hex: "12100E")          // warm ink app base
    static let rbSurface = Color(hex: "1B1714")             // solid card / list-row surface
    static let rbSurfaceLight = Color(hex: "26211C")        // borders / elevated fills
    static let rbSurfaceHighlight = Color(hex: "332B24")    // selected/active row

    // Accent — amber gold ("Gold Standard")
    static let rbAccent = Color(hex: "F5B13D")              // primary interactive
    static let rbAccentLight = Color(hex: "FFD588")         // light accent / big numbers
    static let rbAccentDark = Color(hex: "D68C24")          // gradient start / pressed

    // Ember — the "hot signal": LIVE + rising + waveform detection marker.
    // Deliberately distinct from the gold brand (tokens.color.live/detectionMarker).
    static let rbWarm = Color(hex: "FF5A34")
    static let rbWarmLight = Color(hex: "FF8A5C")           // lighter ember (derived)

    // Text — warm greys
    static let rbTextPrimary = Color(hex: "F7F2E9")
    static let rbTextSecondary = Color(hex: "B6ADA0")
    static let rbTextTertiary = Color(hex: "8B8175")
    static let rbTextQuaternary = Color(hex: "6E655B")      // micro-labels only (>=10pt bold caps)

    // Status
    static let rbSuccess = Color(hex: "47D98A")             // up-trend / positive / active
    static let rbLive = Color(hex: "FF5A34")                // LIVE indicator — pulsing ember, NOT green
    static let rbError = Color(hex: "FF7A6B")               // negative/down — always pair with an icon
    static let rbWarning = Color(hex: "FF9F45")             // orange — PENDING status (NOT amber; amber = brand)
    static let rbInfo = Color(hex: "74A8FF")                // informational blue

    // Gradient — CTA only (tokens.gradient.cta): gold → ember (sunset).
    // Rule: gradient ONLY on the primary CTA and the hero gauge; everything else flat.
    static let rbGradientStart = Color(hex: "F5B13D")
    static let rbGradientEnd = Color(hex: "FF5A34")
    static let rbAccentGradEnd = Color(hex: "FF5A34")       // == rbGradientEnd

    // Glass system (hero-only)
    static let rbGlassTint = Color.white.opacity(0.055)     // card fill over material (hero cards only)
    static let rbGlassBorder = Color.white.opacity(0.11)    // 1px hairline on glass
    static let rbHairline = Color(hex: "FFF0DC").opacity(0.08) // warm row dividers / solid-card border
    static let rbDetection = Color(hex: "FF5A34")           // alias of rbWarm (ember), for clarity

    // Hex initializer
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// Reusable brand gradient — dark red → brand red (CTA + hero gauge ONLY).
extension LinearGradient {
    // 135° (topLeading → bottomTrailing) for the primary CTA and the hero gauge.
    static let rbAccentGradient = LinearGradient(
        colors: [.rbGradientStart, .rbGradientEnd],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    // Horizontal variant for the now-playing progress bar.
    static let rbAccentGradientH = LinearGradient(
        colors: [.rbGradientStart, .rbGradientEnd],
        startPoint: .leading,
        endPoint: .trailing
    )
}

// Typography — Sora (UI) + IBM Plex Mono (timestamps / ISRC / counts).
// Fonts are registered at launch (see FontRegistration). If a face is not
// bundled yet, .custom gracefully falls back to the system font.
extension Font {
    static func sora(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .custom("Sora", size: size).weight(weight)
    }
    static func mono(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .custom("IBM Plex Mono", size: size).weight(weight)
    }
}
