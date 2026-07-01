import SwiftUI

// MARK: - Glass card

/// Glassy translucent card: ultraThinMaterial + subtle white tint fill,
/// hairline border, and a soft top "shine". Replaces the old solid surface card.
struct RBCardStyle: ViewModifier {
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
}

// MARK: - Signature violet glow background

extension View {
    /// Radial violet glow over the app base. Use on Dashboard / Login / Song-detail.
    /// `subtle` = a dimmer, smaller glow for long list screens so they stay readable.
    func onairGlow(subtle: Bool = false) -> some View {
        self.background(
            RadialGradient(
                colors: [
                    Color(hex: "7C5CF6").opacity(subtle ? 0.20 : 0.42),
                    Color(hex: "AF46F0").opacity(subtle ? 0.08 : 0.16),
                    .clear
                ],
                center: .init(x: 0.5, y: -0.05),
                startRadius: 0,
                endRadius: subtle ? 300 : 430
            )
            .background(Color.rbBackground)
            .ignoresSafeArea()
        )
    }
}

// MARK: - Buttons

/// Primary CTA — violet→magenta gradient Capsule, WHITE text (was black on teal).
struct RBAccentButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.sora(16, .bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 32)
            .padding(.vertical, 14)
            .background(
                LinearGradient.rbAccentGradient
                    .opacity(configuration.isPressed ? 0.85 : 1)
            )
            .clipShape(Capsule())
            .shadow(color: Color.rbAccent.opacity(0.5), radius: 14, y: 8)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// Secondary — tinted violet fill + border, light-accent text.
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

/// Circular airplay gauge: a track ring + a violet→magenta trimmed progress arc,
/// with a big centered value and micro-label. Animates its fill on appear.
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
                        colors: [Color(hex: "7C5CF6"), Color(hex: "B84DF0")],
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
