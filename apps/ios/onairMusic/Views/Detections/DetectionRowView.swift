import SwiftUI

/// Compact row displaying a single airplay detection.
/// Shows album artwork thumbnail (server-cached artworkUrl), song title, artist,
/// station name, a discreet "partial play" marker (<30s teaser/jingle), play button,
/// and timestamp. Tapping navigates to SongDetailView. Play button plays snippet inline.
struct DetectionRowView: View {
    let event: AirplayEvent
    @Environment(AudioPlayerManager.self) private var audioPlayer

    private var isActiveRow: Bool {
        audioPlayer.currentlyPlayingId == event.id
    }

    var body: some View {
        HStack(spacing: 12) {
            // Tappable area for navigation
            NavigationLink {
                SongDetailView(event: event)
            } label: {
                HStack(spacing: 12) {
                    artworkThumbnail

                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 5) {
                            Text(event.songTitle)
                                .font(.sora(14, .semibold))
                                .foregroundStyle(Color.rbTextPrimary)
                                .lineLimit(1)

                            if event.partialPlay == true {
                                partialPlayMarker
                            }
                        }

                        Text(event.artistName)
                            .font(.sora(12))
                            .foregroundStyle(Color.rbTextSecondary)
                            .lineLimit(1)

                        if let stationName = event.station?.name {
                            Text(stationName)
                                .font(.sora(11))
                                .foregroundStyle(Color.rbTextQuaternary)
                                .lineLimit(1)
                        }
                    }

                    Spacer()

                    Text(DateFormatters.shortDateTime(event.startedAt))
                        .font(.mono(11))
                        .foregroundStyle(Color.rbTextTertiary)
                        .frame(maxHeight: .infinity, alignment: .top)
                }
            }
            .buttonStyle(.plain)

            // Play snippet button (outside NavigationLink so it works)
            snippetButton
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.rbAccent.opacity(isActiveRow ? 0.09 : 0))
                .padding(.horizontal, 8)
        )
        .contentShape(Rectangle())
    }

    // MARK: - Partial Play Marker

    /// Discreet warning marker for events that played under 30 seconds
    /// (teaser/jingle) — excluded from aggregations server-side.
    private var partialPlayMarker: some View {
        Image(systemName: "exclamationmark.triangle.fill")
            .font(.system(size: 9))
            .foregroundStyle(Color.rbWarning)
            .help("Partial play — under 30 seconds")
            .accessibilityLabel("Partial play, under 30 seconds")
    }

    // MARK: - Snippet Play Button

    @ViewBuilder
    private var snippetButton: some View {
        if event.snippetUrl != nil {
            Button {
                Task {
                    await audioPlayer.play(
                        eventId: event.id,
                        metadata: SnippetMetadata(
                            title: event.songTitle,
                            artist: event.artistName,
                            stationName: event.station?.name,
                            artworkUrl: event.artworkUrl
                        )
                    )
                }
            } label: {
                if isActiveRow && audioPlayer.isLoadingSnippet {
                    ProgressView()
                        .tint(Color.rbAccent)
                        .frame(width: 30, height: 30)
                } else {
                    Image(systemName: isActiveRow && audioPlayer.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 30))
                        .foregroundStyle(Color.rbAccent)
                }
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Artwork Thumbnail

    /// Uses the server-cached Deezer artwork URL from the API (no per-row
    /// client-side Deezer search anymore). Falls back to a placeholder.
    private var artworkThumbnail: some View {
        Group {
            if let urlString = event.artworkUrl, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    default:
                        artworkPlaceholder
                    }
                }
            } else {
                artworkPlaceholder
            }
        }
        .frame(width: 48, height: 48)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private var artworkPlaceholder: some View {
        ZStack {
            Color.rbAccent.opacity(0.15)
            Image(systemName: "music.note")
                .font(.system(size: 16))
                .foregroundStyle(Color.rbAccentLight)
        }
    }
}

// MARK: - Button Style

struct DetectionRowButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(configuration.isPressed ? Color.rbSurfaceHighlight : Color.clear)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}
