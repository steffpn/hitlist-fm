import SwiftUI

/// Twitter/X-style "New detections" overlay pill.
/// Blue capsule with arrow-up icon and count text. Appears when user is scrolled down
/// and new detections arrive. Tapping scrolls to top and dismisses the pill.
struct NewDetectionsPill: View {
    let count: Int
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 4) {
                Image(systemName: "arrow.up")
                    .font(.sora(11, .bold))
                Text(count == 1 ? "1 new detection" : "\(count) new detections")
                    .font(.sora(11, .bold))
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(LinearGradient.rbAccentGradient)
            .foregroundStyle(.white)
            .clipShape(Capsule())
            .shadow(color: Color.rbAccent.opacity(0.5), radius: 12, y: 6)
        }
    }
}
