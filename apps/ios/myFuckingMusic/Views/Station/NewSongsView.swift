import SwiftUI

/// New songs appearing on a station for the first time.
/// Shows green "NEW" badges and first-played timestamps.
struct NewSongsView: View {
    @State private var viewModel = StationAnalyticsViewModel()

    /// The station ID to load new songs for.
    /// When nil, loads for the user's own station (stationId 0 as sentinel).
    let stationId: Int

    init(stationId: Int = 0) {
        self.stationId = stationId
    }

    var body: some View {
        ZStack {
            if viewModel.isLoading && viewModel.newSongs.isEmpty {
                LoadingView()
            } else if let errorMessage = viewModel.error, viewModel.newSongs.isEmpty {
                ErrorView(message: errorMessage) {
                    Task { await viewModel.loadNewSongs(stationId: stationId) }
                }
            } else if viewModel.newSongs.isEmpty {
                emptyStateView
            } else {
                ScrollView {
                    VStack(spacing: 0) {
                        // Period picker
                        Picker("Period", selection: $viewModel.selectedPeriod) {
                            Text("Today").tag("day")
                            Text("This Week").tag("week")
                            Text("This Month").tag("month")
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .colorMultiply(.rbAccent)

                        LazyVStack(spacing: 0) {
                            ForEach(viewModel.newSongs) { song in
                                newSongRow(song)

                                Divider()
                                    .overlay(Color.rbHairline)
                                    .padding(.leading, 74)
                            }
                        }
                    }
                    .padding(.bottom, 40)
                }
                .refreshable {
                    await viewModel.loadNewSongs(stationId: stationId)
                }
            }
        }
        .onairGlow(subtle: true)
        .navigationTitle("New Songs")
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(Color.rbBackground, for: .navigationBar)
        .preferredColorScheme(.dark)
        .task(id: viewModel.selectedPeriod) {
            await viewModel.loadNewSongs(stationId: stationId)
        }
    }

    // MARK: - New Song Row

    private func newSongRow(_ song: NewSongItem) -> some View {
        HStack(spacing: 14) {
            // Song icon with NEW badge overlay
            ZStack(alignment: .topTrailing) {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(LinearGradient.rbAccentGradient)
                    .frame(width: 46, height: 46)
                    .overlay {
                        Image(systemName: "music.note")
                            .font(.system(size: 18))
                            .foregroundStyle(.white)
                    }

                // NEW badge
                Text("NEW")
                    .font(.sora(7, .black))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 4)
                    .padding(.vertical, 2)
                    .background(
                        Capsule()
                            .fill(Color.rbLive)
                    )
                    .offset(x: 4, y: -4)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(song.songTitle)
                    .font(.sora(14, .semibold))
                    .foregroundStyle(Color.rbTextPrimary)
                    .lineLimit(1)

                Text(song.artistName)
                    .font(.sora(12))
                    .foregroundStyle(Color.rbTextSecondary)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.system(size: 10))
                        .foregroundStyle(Color.rbTextTertiary)

                    Text(formatFirstPlayed(song.firstPlayedAt))
                        .font(.mono(10))
                        .foregroundStyle(Color.rbTextTertiary)
                }
            }

            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "sparkles")
                .font(.system(size: 48))
                .foregroundStyle(Color.rbTextTertiary)

            Text("No New Songs")
                .font(.sora(20, .semibold))
                .foregroundStyle(Color.rbTextPrimary)

            Text("New songs detected for the first time will appear here")
                .font(.sora(14))
                .foregroundStyle(Color.rbTextSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Helpers

    private func formatFirstPlayed(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

#Preview {
    NavigationStack {
        NewSongsView(stationId: 1)
    }
    .preferredColorScheme(.dark)
}
