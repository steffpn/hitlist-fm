import SwiftUI

/// Floating mini-player bar shown while a broadcast snippet plays.
struct NowPlayingBar: View {
    @Environment(AudioPlayerManager.self) private var player
    @State private var isSeeking = false
    @State private var seekProgress: Double = 0

    var body: some View {
        if player.currentlyPlayingId != nil && !player.isLoadingSnippet {
            VStack(spacing: 0) {
                // Seekable progress bar - tall touch target
                progressBar

                // Controls row
                HStack(spacing: 12) {
                    Image(systemName: "waveform")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.rbAccent)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(player.currentMetadata?.title ?? "Broadcast Proof")
                            .font(.sora(12, .semibold))
                            .foregroundStyle(Color.rbTextPrimary)
                            .lineLimit(1)
                        Text(subtitleLabel)
                            .font(.system(size: 10, design: .monospaced))
                            .foregroundStyle(Color.rbAccent)
                            .lineLimit(1)
                    }

                    Spacer()

                    Button {
                        if player.isPlaying { player.pause() } else { player.resume() }
                    } label: {
                        Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 15))
                            .foregroundStyle(.white)
                            .frame(width: 34, height: 34)
                            .background(Color.white.opacity(0.10), in: Circle())
                    }

                    Button { player.stop() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color.rbTextTertiary)
                            .frame(width: 28, height: 28)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
            }
            .background(Color.rbBackground.opacity(0.72))
            .background(.ultraThinMaterial)
            .overlay(alignment: .top) { Color.rbHairline.frame(height: 1) }
            .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }

    // MARK: - Seekable Progress Bar

    private var displayProgress: Double {
        isSeeking ? seekProgress : player.playbackProgress
    }

    private var progressBar: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                // Background
                Color.rbSurfaceLight

                // Progress fill - no animation while seeking
                Color.rbAccent
                    .frame(width: geo.size.width * CGFloat(displayProgress))
            }
            // Large touch target, thin visual bar centered vertically
            .frame(height: isSeeking ? 20 : 4)
            .frame(maxHeight: .infinity)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        if !isSeeking {
                            isSeeking = true
                            seekProgress = player.playbackProgress
                        }
                        seekProgress = min(max(value.location.x / geo.size.width, 0), 1)
                        player.seek(to: seekProgress)
                    }
                    .onEnded { _ in
                        isSeeking = false
                    }
            )
            .animation(.easeInOut(duration: 0.15), value: isSeeking)
        }
        .frame(height: 30) // Tall touch target area
    }

    // MARK: - Helpers

    private var timeLabel: String {
        let current = Int(player.currentTime)
        let total = Int(max(player.duration, 1))
        return String(format: "%d:%02d / %d:%02d", current / 60, current % 60, total / 60, total % 60)
    }

    /// "Kiss FM · 0:12 / 0:30" when the station is known, otherwise just the time.
    private var subtitleLabel: String {
        if let station = player.currentMetadata?.stationName {
            return "\(station) · \(timeLabel)"
        }
        return timeLabel
    }
}
