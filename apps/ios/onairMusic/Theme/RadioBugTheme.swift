import SwiftUI

// onair.music — "Pulse / 2c Violet" dark theme.
// Near-black violet base, glassy translucent cards, violet→magenta brand gradient.
// Token NAMES are unchanged from the old RadioBug theme so no call sites break;
// only the hex values changed (teal → violet). See design_handoff_onair_violet.
extension Color {
    // Backgrounds
    static let rbBackground = Color(hex: "0A070E")          // violet-tinted near-black app base
    static let rbSurface = Color(hex: "16121F")             // solid fallback (prefer .rbCard glass)
    static let rbSurfaceLight = Color(hex: "241C36")         // borders / elevated fills
    static let rbSurfaceHighlight = Color(hex: "2E2442")    // selected/active row

    // Accent — violet ("Pulse")
    static let rbAccent = Color(hex: "9A6DFF")              // primary interactive
    static let rbAccentLight = Color(hex: "C4A5FF")         // light accent text (LIVE, Premium)
    static let rbAccentDark = Color(hex: "7C5CF6")          // gradient start / pressed

    // Secondary accent — warm coral: semantic "detection point" marker ONLY (unchanged)
    static let rbWarm = Color(hex: "FF6B35")
    static let rbWarmLight = Color(hex: "FFA06B")

    // Text
    static let rbTextPrimary = Color(hex: "F3F1F6")
    static let rbTextSecondary = Color(hex: "A8A2B6")
    static let rbTextTertiary = Color(hex: "8E86A2")
    static let rbTextQuaternary = Color(hex: "726A84")      // dimmest labels / inactive tab

    // Status
    static let rbLive = Color(hex: "34D399")               // up-trend green / "Live" dot
    static let rbError = Color(hex: "FF7B7B")              // softer red (Log out)
    static let rbWarning = Color(hex: "FBBF24")            // amber — PENDING status

    // Gradients (violet → magenta-purple)
    static let rbGradientStart = Color(hex: "7C5CF6")      // violet
    static let rbGradientEnd = Color(hex: "B84DF0")        // magenta-purple
    static let rbAccentGradEnd = Color(hex: "B84DF0")      // == rbGradientEnd

    // Glass system
    static let rbGlassTint = Color.white.opacity(0.055)    // card fill over material
    static let rbGlassBorder = Color.white.opacity(0.11)   // 1px hairline on glass
    static let rbHairline = Color.white.opacity(0.08)      // row dividers
    static let rbDetection = Color(hex: "FF6B35")          // alias of rbWarm, for clarity

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

// Reusable brand gradient — violet → magenta.
extension LinearGradient {
    // 135° (topLeading → bottomTrailing) for fills, buttons, artwork tiles, gauge.
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
