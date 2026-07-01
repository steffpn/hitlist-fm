import SwiftUI

// onair.music — direction A "ON AIR": broadcast red on warm black.
// Source of truth: packages/tokens/tokens.json — values here must mirror it exactly.
// Token NAMES are unchanged from the old RadioBug theme so no call sites break;
// only the hex values changed (violet → broadcast red).
extension Color {
    // Backgrounds — warm black
    static let rbBackground = Color(hex: "0B0A0A")          // warm near-black app base
    static let rbSurface = Color(hex: "151313")             // solid card / list-row surface
    static let rbSurfaceLight = Color(hex: "232020")        // borders / elevated fills
    static let rbSurfaceHighlight = Color(hex: "2D2827")    // selected/active row

    // Accent — broadcast red ("ON AIR")
    static let rbAccent = Color(hex: "FF4B45")              // primary interactive
    static let rbAccentLight = Color(hex: "FF8A80")         // light accent text
    static let rbAccentDark = Color(hex: "D92D26")          // gradient start / pressed

    // Secondary accent — amber: semantic "detection point" marker ONLY.
    // Deliberately distinct from brand red (tokens.color.detectionMarker).
    static let rbWarm = Color(hex: "FFC53D")
    static let rbWarmLight = Color(hex: "FFD97C")           // lighter amber (derived)

    // Text — warm greys
    static let rbTextPrimary = Color(hex: "F5F3F2")
    static let rbTextSecondary = Color(hex: "ABA4A2")
    static let rbTextTertiary = Color(hex: "8E8886")
    static let rbTextQuaternary = Color(hex: "827C7A")      // micro-labels only (>=10pt bold caps)

    // Status
    static let rbSuccess = Color(hex: "30D158")             // up-trend / positive / active
    static let rbLive = Color(hex: "FF4B45")                // LIVE indicator — pulsing broadcast red, NOT green
    static let rbError = Color(hex: "FF8A80")               // sits close to brand red — always pair with an icon
    static let rbWarning = Color(hex: "FFC53D")             // amber — PENDING status
    static let rbInfo = Color(hex: "6CA8FF")                // informational blue

    // Gradient — CTA only (tokens.gradient.cta): dark red → brand red.
    // Rule: gradient ONLY on the primary CTA and the hero gauge; everything else flat.
    static let rbGradientStart = Color(hex: "D92D26")
    static let rbGradientEnd = Color(hex: "FF4B45")
    static let rbAccentGradEnd = Color(hex: "FF4B45")       // == rbGradientEnd

    // Glass system (unchanged)
    static let rbGlassTint = Color.white.opacity(0.055)     // card fill over material (hero cards only)
    static let rbGlassBorder = Color.white.opacity(0.11)    // 1px hairline on glass
    static let rbHairline = Color.white.opacity(0.08)       // row dividers / solid-card border
    static let rbDetection = Color(hex: "FFC53D")           // alias of rbWarm, for clarity

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
