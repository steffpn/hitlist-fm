import SwiftUI

/// List of songs the artist is monitoring for airplay detection.
/// Each row shows song info, status, play stats, and trend.
/// Tapping navigates to the detailed SongAnalyticsView.
struct MonitoredSongsView: View {
    @State private var viewModel = MonitoredSongsViewModel()
    @State private var showingAddSheet = false

    var body: some View {
        ZStack {
            if viewModel.isLoading && viewModel.songs.isEmpty {
                LoadingView()
            } else if let errorMessage = viewModel.error, viewModel.songs.isEmpty {
                ErrorView(message: errorMessage) {
                    Task { await viewModel.loadSongs() }
                }
            } else if viewModel.songs.isEmpty {
                emptyState
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        Text("\(viewModel.songs.count) song\(viewModel.songs.count == 1 ? "" : "s") monitored")
                            .font(.sora(13, .medium))
                            .foregroundStyle(Color.rbTextSecondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.bottom, 2)

                        ForEach(viewModel.songs) { song in
                            NavigationLink {
                                SongAnalyticsView(song: song)
                            } label: {
                                songRow(song)
                            }
                            .buttonStyle(SongRowButtonStyle())
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 40)
                }
                .refreshable {
                    await viewModel.loadSongs()
                }
            }
        }
        .onairGlow(subtle: true)
        .navigationTitle("My Songs")
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(Color.rbBackground, for: .navigationBar)
        .preferredColorScheme(.dark)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingAddSheet = true
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 38, height: 38)
                        .background(
                            LinearGradient.rbAccentGradient,
                            in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                        )
                        .shadow(color: Color.rbAccent.opacity(0.5), radius: 10, y: 5)
                }
            }
        }
        .sheet(isPresented: $showingAddSheet) {
            AddSongSheet(viewModel: viewModel)
        }
        .task {
            await viewModel.loadSongs()
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "music.note.list")
                .font(.system(size: 48, weight: .light))
                .foregroundStyle(LinearGradient.rbAccentGradient)

            Text("No Monitored Songs")
                .font(.sora(20, .bold))
                .foregroundStyle(Color.rbTextPrimary)

            Text("Add songs to track their airplay across radio stations.")
                .font(.sora(14))
                .foregroundStyle(Color.rbTextSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Button {
                showingAddSheet = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus")
                        .font(.system(size: 14, weight: .bold))
                    Text("Add Song")
                }
            }
            .buttonStyle(RBAccentButtonStyle())
            .padding(.top, 8)
        }
    }

    // MARK: - Song Row

    private func songRow(_ song: MonitoredSong) -> some View {
        HStack(spacing: 12) {
            // Song thumbnail
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(LinearGradient.rbAccentGradient)
                .frame(width: 46, height: 46)
                .overlay {
                    Image(systemName: "music.note")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.9))
                }

            // Song info
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(song.songTitle)
                        .font(.sora(14, .semibold))
                        .foregroundStyle(Color.rbTextPrimary)
                        .lineLimit(1)

                    statusBadge(song.status)
                }

                Text(song.isrc)
                    .font(.mono(11))
                    .foregroundStyle(Color.rbTextQuaternary)
                    .lineLimit(1)

                // Stats row
                HStack(spacing: 12) {
                    if let plays = song.totalPlays {
                        HStack(spacing: 3) {
                            Image(systemName: "play.fill")
                                .font(.system(size: 8))
                                .foregroundStyle(Color.rbAccent)
                            Text("\(plays) plays")
                                .font(.sora(12, .medium))
                                .foregroundStyle(Color.rbTextSecondary)
                        }
                    }

                    if let stations = song.stationCount {
                        HStack(spacing: 3) {
                            Image(systemName: "antenna.radiowaves.left.and.right")
                                .font(.system(size: 8))
                                .foregroundStyle(Color.rbTextTertiary)
                            Text("\(stations) stations")
                                .font(.sora(12, .medium))
                                .foregroundStyle(Color.rbTextSecondary)
                        }
                    }
                }
            }

            Spacer()

            // Trend + chevron
            VStack(alignment: .trailing, spacing: 6) {
                if let trend = song.trend {
                    TrendBadge(
                        direction: trend.direction,
                        percentChange: trend.percentChange,
                        compact: true
                    )
                }

                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundStyle(Color.rbTextTertiary)
            }
        }
        .padding(12)
        .rbCard(radius: 18)
        .contentShape(Rectangle())
    }

    // MARK: - Status Badge

    private func statusBadge(_ status: String) -> some View {
        let (color, label) = statusInfo(status)
        return Text(label)
            .font(.sora(9, .bold))
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(
                Capsule()
                    .fill(color.opacity(0.16))
            )
    }

    private func statusInfo(_ status: String) -> (Color, String) {
        switch status.lowercased() {
        case "active":
            return (Color.rbLive, "ACTIVE")
        case "expired":
            return (Color.rbTextTertiary, "EXPIRED")
        case "pending":
            return (Color.rbWarning, "PENDING")
        default:
            return (Color.rbTextTertiary, status.uppercased())
        }
    }
}

// MARK: - Button Style

private struct SongRowButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

#Preview {
    NavigationStack {
        MonitoredSongsView()
    }
    .preferredColorScheme(.dark)
}
