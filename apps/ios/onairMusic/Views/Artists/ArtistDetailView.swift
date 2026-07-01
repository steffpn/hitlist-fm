import SwiftUI

/// Detail view for a single artist showing photo, stats, and detected songs.
struct ArtistDetailView: View {
    let artist: ArtistSummary
    let viewModel: ArtistsViewModel
    @State private var dominantColors: [Color] = [.rbSurface, .rbBackground, .rbSurfaceLight]
    @State private var appearAnimation = false

    var body: some View {
        ZStack {
            backgroundGradient
                .ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    Spacer()
                        .frame(height: 20)

                    // Artist photo
                    artistPhotoSection
                        .padding(.bottom, 20)

                    // Artist name
                    artistNameSection
                        .padding(.bottom, 24)

                    // Stats row
                    statsRow
                        .padding(.horizontal, 24)
                        .padding(.bottom, 28)

                    // Detected Songs section
                    detectedSongsSection
                        .padding(.horizontal, 24)
                        .padding(.bottom, 40)
                }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .task {
            await viewModel.loadArtistImage(for: artist.name)
            extractColors()
            withAnimation(.easeOut(duration: 0.6)) {
                appearAnimation = true
            }
            // Detail events are fetched on demand (summary comes pre-aggregated).
            await viewModel.loadEvents(for: artist.name)
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Background Gradient

    private var backgroundGradient: some View {
        LinearGradient(
            stops: [
                .init(color: dominantColors[0].opacity(0.7), location: 0.0),
                .init(color: dominantColors[safe: 1]?.opacity(0.4) ?? .rbSurface.opacity(0.4), location: 0.3),
                .init(color: dominantColors[safe: 2]?.opacity(0.2) ?? .rbBackground.opacity(0.2), location: 0.55),
                .init(color: .rbBackground, location: 0.85),
            ],
            startPoint: .top,
            endPoint: .bottom
        )
        .animation(.easeInOut(duration: 0.8), value: dominantColors.count)
    }

    // MARK: - Artist Photo

    private var artistPhotoSection: some View {
        Group {
            if let image = viewModel.artistImages[artist.name] {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 120, height: 120)
                    .clipShape(Circle())
                    .shadow(color: dominantColors[0].opacity(0.5), radius: 20, x: 0, y: 10)
                    .shadow(color: .black.opacity(0.4), radius: 15, x: 0, y: 8)
                    .scaleEffect(appearAnimation ? 1.0 : 0.9)
                    .opacity(appearAnimation ? 1.0 : 0.0)
            } else {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [.rbSurfaceLight, .rbSurface],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 120, height: 120)
                    .overlay {
                        Image(systemName: "person.fill")
                            .font(.system(size: 40, weight: .light))
                            .foregroundStyle(Color.rbAccent.opacity(0.6))
                    }
                    .shadow(color: .black.opacity(0.3), radius: 15, x: 0, y: 8)
            }
        }
    }

    // MARK: - Artist Name

    private var artistNameSection: some View {
        VStack(spacing: 6) {
            Text(artist.name)
                .font(.sora(28, .bold))
                .foregroundStyle(Color.rbTextPrimary)
                .multilineTextAlignment(.center)
                .lineLimit(3)

            if let topSong {
                HStack(spacing: 4) {
                    Image(systemName: "star.fill")
                        .font(.caption2)
                        .foregroundStyle(Color.rbAccentLight)
                    Text("Top: \(topSong)")
                        .font(.sora(12))
                        .foregroundStyle(Color.rbTextSecondary)
                        .lineLimit(1)
                }
            }
        }
        .opacity(appearAnimation ? 1.0 : 0.0)
        .offset(y: appearAnimation ? 0 : 10)
    }

    // MARK: - Stats Row

    private var statsRow: some View {
        HStack(spacing: 0) {
            statItem(value: "\(artist.playCount)", label: "Total Plays", icon: "play.fill")

            Divider()
                .frame(height: 40)
                .overlay(Color.rbHairline)

            statItem(value: "\(artist.songCount)", label: "Unique Songs", icon: "music.note")

            Divider()
                .frame(height: 40)
                .overlay(Color.rbHairline)

            statItem(value: "\(artist.stationCount)", label: "Stations", icon: "antenna.radiowaves.left.and.right")
        }
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(.ultraThinMaterial)
        )
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.rbGlassTint)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(Color.rbGlassBorder, lineWidth: 1)
        )
        .opacity(appearAnimation ? 1.0 : 0.0)
        .offset(y: appearAnimation ? 0 : 15)
    }

    private func statItem(value: String, label: String, icon: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(Color.rbAccent)

            Text(value)
                .font(.sora(19, .heavy))
                .foregroundStyle(Color.rbAccent)

            Text(label.uppercased())
                .font(.sora(9, .semibold))
                .tracking(0.8)
                .foregroundStyle(Color.rbTextTertiary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Detected Songs Section

    private var detectedSongsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Detected Songs")
                .font(.sora(17, .bold))
                .foregroundStyle(Color.rbTextPrimary)
                .padding(.bottom, 4)

            let events = viewModel.events(for: artist.name)

            if events.isEmpty {
                Text("No recent detections found")
                    .font(.sora(14))
                    .foregroundStyle(Color.rbTextTertiary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                ForEach(events) { event in
                    NavigationLink {
                        SongDetailView(event: event)
                    } label: {
                        artistSongRow(event: event)
                    }
                    .buttonStyle(ArtistSongRowButtonStyle())
                }
            }
        }
        .opacity(appearAnimation ? 1.0 : 0.0)
        .offset(y: appearAnimation ? 0 : 15)
    }

    private func artistSongRow(event: AirplayEvent) -> some View {
        HStack(spacing: 12) {
            // Album artwork thumbnail
            
            SongThumbnail(artist: event.artistName, title: event.songTitle)

            VStack(alignment: .leading, spacing: 3) {
                Text(event.songTitle)
                    .font(.sora(14, .medium))
                    .foregroundStyle(Color.rbTextPrimary)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    if let stationName = event.station?.name {
                        Text(stationName)
                            .font(.sora(12))
                            .foregroundStyle(Color.rbTextSecondary)
                            .lineLimit(1)
                    }

                    Text(DateFormatters.shortDateTime(event.startedAt))
                        .font(.mono(10))
                        .foregroundStyle(Color.rbTextTertiary)
                }
            }

            Spacer()

            if event.playCount > 1 {
                Text("\(event.playCount)x")
                    .font(.mono(12, .medium))
                    .foregroundStyle(Color.rbAccent)
            }

            Image(systemName: "chevron.right")
                .font(.caption2)
                .foregroundStyle(Color.rbTextTertiary)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(.ultraThinMaterial)
        )
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.rbGlassTint)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color.rbGlassBorder, lineWidth: 1)
        )
        .contentShape(Rectangle())
    }

    // MARK: - Helpers

    /// Most played song derived from the lazily loaded recent events.
    private var topSong: String? {
        let events = viewModel.events(for: artist.name)
        guard !events.isEmpty else { return nil }
        let counts = Dictionary(events.map { ($0.songTitle, $0.playCount) }, uniquingKeysWith: +)
        return counts.max(by: { $0.value < $1.value })?.key
    }

    private func extractColors() {
        if let image = viewModel.artistImages[artist.name] {
            dominantColors = ColorExtractor.extractColors(from: image, count: 3)
        }
    }
}

// MARK: - Safe Array Subscript

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

// MARK: - Button Style

private struct ArtistSongRowButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

#Preview {
    NavigationStack {
        ArtistDetailView(
            artist: ArtistSummary(
                artistName: "The Weeknd",
                playCount: 42,
                songCount: 8,
                stationCount: 2,
                lastPlayAt: Date()
            ),
            viewModel: ArtistsViewModel()
        )
    }
    .preferredColorScheme(.dark)
}
