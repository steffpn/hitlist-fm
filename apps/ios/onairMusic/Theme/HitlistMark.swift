import SwiftUI

/// The hitlist.fm rotation-gauge brand mark, drawn on-dark (gold→ember arc on a
/// faint ring, gold needle + hub). Geometry mirrors
/// design_handoff_hitlist_fm/logo/mark.svg (viewBox 120, center 60,60).
/// Use on Login / Welcome / brand moments. For the app icon see Assets.
struct HitlistMark: View {
    var size: CGFloat = 64

    private func d(_ v: CGFloat) -> CGFloat { size * v / 120 }

    var body: some View {
        ZStack {
            // Base ring (r52)
            Circle()
                .stroke(Color(hex: "FFF0DC").opacity(0.10), lineWidth: d(2))
                .frame(width: d(104), height: d(104))

            // Dotted tick ring (r43)
            Circle()
                .stroke(
                    Color.rbAccent.opacity(0.32),
                    style: StrokeStyle(lineWidth: d(2.5), lineCap: .round, dash: [d(1), d(8)])
                )
                .frame(width: d(86), height: d(86))

            // Gauge track — faint 270° arc
            Circle()
                .trim(from: 0, to: 0.75)
                .stroke(
                    Color(hex: "FFF0DC").opacity(0.08),
                    style: StrokeStyle(lineWidth: d(6), lineCap: .round)
                )
                .frame(width: d(104), height: d(104))
                .rotationEffect(.degrees(135))

            // Gauge fill — gold→ember, ~78% of the arc
            Circle()
                .trim(from: 0, to: 0.75 * 0.78)
                .stroke(
                    LinearGradient(
                        colors: [.rbGradientStart, .rbGradientEnd],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    ),
                    style: StrokeStyle(lineWidth: d(6), lineCap: .round)
                )
                .frame(width: d(104), height: d(104))
                .rotationEffect(.degrees(135))

            // Needle — center → (93,41)
            GaugeNeedle()
                .stroke(Color.rbAccentLight, style: StrokeStyle(lineWidth: d(4), lineCap: .round))
                .frame(width: size, height: size)

            // Hub — gold disc + ink pupil
            Circle().fill(Color.rbAccent).frame(width: d(16), height: d(16))
            Circle().fill(Color.rbBackground).frame(width: d(6.8), height: d(6.8))
        }
        .frame(width: size, height: size)
    }
}

private struct GaugeNeedle: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let s = rect.width
        p.move(to: CGPoint(x: s * 60 / 120, y: s * 60 / 120))
        p.addLine(to: CGPoint(x: s * 93 / 120, y: s * 41 / 120))
        return p
    }
}
