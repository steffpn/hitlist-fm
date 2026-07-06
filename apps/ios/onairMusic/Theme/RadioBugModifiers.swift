import SwiftUI

// MARK: - Cards

/// Standard card — SOLID warm surface + 8% white hairline border.
/// Per ON AIR token rules: no glass/blur on list rows or content cards.
struct RBCardStyle: ViewModifier {
    var radius: CGFloat = 22
    func body(content: Content) -> some View {
        content
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(Color.rbSurface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .strokeBorder(Color.rbHairline, lineWidth: 1)
            )
    }
}

/// Hero card — glassy translucent variant. Reserved for dashboard hero
/// cards only (ultraThinMaterial + tint + hairline + soft top shine).
struct RBGlassCardStyle: ViewModifier {
    var radius: CGFloat = 22
    func body(content: Content) -> some View {
        content
            .padding(16)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: radius, style: .continuous))
            .background(RoundedRectangle(cornerRadius: radius, style: .continuous).fill(Color.rbGlassTint))
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .strokeBorder(Color.rbGlassBorder, lineWidth: 1)
            )
            .overlay(alignment: .top) {
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .stroke(Color.white.opacity(0.06), lineWidth: 1)
                    .blur(radius: 2)
                    .mask(LinearGradient(colors: [.white, .clear], startPoint: .top, endPoint: .center))
            }
    }
}

extension View {
    func rbCard(radius: CGFloat = 22) -> some View {
        modifier(RBCardStyle(radius: radius))
    }
    /// Glass variant — dashboard hero cards ONLY.
    func rbGlassCard(radius: CGFloat = 22) -> some View {
        modifier(RBGlassCardStyle(radius: radius))
    }
}

// MARK: - App background

extension View {
    /// Flat warm-black app background. The old radial glow is intentionally
    /// gone (ON AIR rule: "No radial glow backgrounds"); the signature and
    /// parameter are kept so the ~40 call sites keep compiling.
    func onairGlow(subtle: Bool = false) -> some View {
        _ = subtle
        return self.background(Color.rbBackground.ignoresSafeArea())
    }

    /// Single allowed brand moment: a subtle gold→ember "sunset" wash for the
    /// Login / Welcome screens only. Do NOT use on list or content screens.
    func onairBrandGlow() -> some View {
        self.background(
            RadialGradient(
                colors: [
                    Color.rbAccent.opacity(0.14),
                    Color.rbWarm.opacity(0.05),
                    .clear
                ],
                center: .init(x: 0.5, y: -0.05),
                startRadius: 0,
                endRadius: 360
            )
            .background(Color.rbBackground)
            .ignoresSafeArea()
        )
    }
}

// MARK: - LIVE pulse

/// Broadcast-convention pulse for the red LIVE indicator dot.
struct RBLivePulse: ViewModifier {
    @State private var isPulsing = false
    func body(content: Content) -> some View {
        content
            .opacity(isPulsing ? 0.35 : 1.0)
            .animation(
                .easeInOut(duration: 0.9).repeatForever(autoreverses: true),
                value: isPulsing
            )
            .onAppear { isPulsing = true }
    }
}

extension View {
    func rbLivePulse() -> some View {
        modifier(RBLivePulse())
    }
}

// MARK: - Buttons

/// Primary CTA — gold→ember "sunset" gradient Capsule, INK text.
/// (The gradient's gold end is too light for white — label must be ink.)
/// This is one of only two places the brand gradient is allowed.
struct RBAccentButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.sora(16, .bold))
            .foregroundStyle(Color.rbBackground)
            .padding(.horizontal, 32)
            .padding(.vertical, 14)
            .background(
                LinearGradient.rbAccentGradient
                    .opacity(configuration.isPressed ? 0.85 : 1)
            )
            .clipShape(Capsule())
            .shadow(color: Color.rbAccent.opacity(0.35), radius: 14, y: 8)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// Secondary — tinted red fill + border, light-accent text.
struct RBSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.sora(16, .semibold))
            .foregroundStyle(Color.rbAccentLight)
            .padding(.horizontal, 32)
            .padding(.vertical, 14)
            .background(Color.rbAccent.opacity(configuration.isPressed ? 0.18 : 0.12))
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Color.rbAccent.opacity(0.4), lineWidth: 1))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

// MARK: - Airplay Pulse gauge (dashboard hero ring)

/// Circular airplay gauge: a track ring + a gradient trimmed progress arc,
/// with a big centered value and micro-label. Animates its fill on appear.
/// The hero gauge is the second (and last) place the brand gradient is allowed.
struct AirplayGauge: View {
    var value: Int
    var fraction: Double          // 0…1 fill (e.g. today ÷ personal best)
    var caption: String = "TODAY"
    var size: CGFloat = 88

    @State private var animated = false

    var body: some View {
        ZStack {
            Circle().stroke(Color.white.opacity(0.10), lineWidth: 7)
            Circle()
                .trim(from: 0, to: animated ? max(0, min(fraction, 1)) : 0)
                .stroke(
                    LinearGradient(
                        colors: [Color.rbGradientStart, Color.rbGradientEnd],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    ),
                    style: .init(lineWidth: 7, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
            VStack(spacing: 2) {
                Text("\(value)")
                    .font(.sora(23, .heavy))
                    .foregroundStyle(Color.rbTextPrimary)
                Text(caption)
                    .font(.sora(9, .semibold))
                    .tracking(0.8)
                    .foregroundStyle(Color.rbTextTertiary)
            }
        }
        .frame(width: size, height: size)
        .onAppear {
            withAnimation(.easeOut(duration: 0.7)) { animated = true }
        }
    }
}
