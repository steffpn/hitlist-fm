import SwiftUI

/// Main dashboard for station role users.
/// Shows summary cards, period picker, and top songs ranking.
struct StationDashboardView: View {
    @State private var viewModel = StationDashboardViewModel()

    var body: some View {
        ZStack {
            if viewModel.isLoading && viewModel.overview == nil {
                LoadingView()
            } else if let errorMessage = viewModel.error, viewModel.overview == nil {
                ErrorView(message: errorMessage) {
                    Task { await viewModel.loadOverview() }
                }
            } else {
                ScrollView {
                    VStack(spacing: 20) {
                        // Period picker
                        Picker("Period", selection: $viewModel.selectedPeriod) {
                            Text("Today").tag("day")
                            Text("This Week").tag("week")
                            Text("This Month").tag("month")
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal, 16)
                        .colorMultiply(.rbAccent)

                        // Summary cards
                        if let overview = viewModel.overview {
                            summaryCards(overview)
                        }

                        // Top songs ranking
                        if !viewModel.topSongs.isEmpty {
                            topSongsSection
                        }
                    }
                    .padding(.top, 8)
                    .padding(.bottom, 40)
                }
                .refreshable {
                    await viewModel.loadOverview()
                }
            }
        }
        .onairGlow(subtle: true)
        .navigationTitle("My Station")
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(Color.rbBackground, for: .navigationBar)
        .preferredColorScheme(.dark)
        .task(id: viewModel.selectedPeriod) {
            await viewModel.loadOverview()
        }
    }

    // MARK: - Summary Cards

    @ViewBuilder
    private func summaryCards(_ overview: StationOverviewResponse) -> some View {
        HStack(spacing: 12) {
            stationStatCard(
                title: "Total Plays",
                value: "\(overview.totalPlays)",
                icon: "play.circle.fill",
                color: .rbAccent
            )

            stationStatCard(
                title: "Unique Songs",
                value: "\(overview.uniqueSongs)",
                icon: "music.note",
                color: .purple
            )

            stationStatCard(
                title: "Artists",
                value: "\(overview.uniqueArtists)",
                icon: "person.2.fill",
                color: .rbWarm
            )
        }
        .padding(.horizontal, 16)
    }

    private func stationStatCard(title: String, value: String, icon: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)

            Text(value)
                .font(.sora(26, .heavy))
                .foregroundStyle(Color.rbAccent)

            Text(title.uppercased())
                .font(.sora(10, .semibold))
                .tracking(1.4)
                .foregroundStyle(Color.rbTextTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 4)
        .rbCard(radius: 18)
    }

    // MARK: - Top Songs

    private var topSongsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Image(systemName: "chart.bar.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.rbAccent)

                Text("Top Songs")
                    .font(.sora(16, .bold))
                    .foregroundStyle(Color.rbTextPrimary)

                Spacer()

                Text("\(viewModel.topSongs.count) songs")
                    .font(.mono(11))
                    .foregroundStyle(Color.rbTextTertiary)
            }

            LazyVStack(spacing: 0) {
                ForEach(viewModel.topSongs) { song in
                    topSongRow(song)

                    if song.rank < viewModel.topSongs.count {
                        Divider()
                            .overlay(Color.rbHairline)
                            .padding(.leading, 44)
                    }
                }
            }
        }
        .rbCard()
        .padding(.horizontal, 16)
    }

    private func topSongRow(_ song: StationTopSong) -> some View {
        HStack(spacing: 12) {
            // Rank badge
            Text("\(song.rank)")
                .font(.mono(15, .bold))
                .foregroundStyle(song.rank <= 3 ? Color.rbWarm : Color.rbTextTertiary)
                .frame(width: 28, alignment: .center)

            VStack(alignment: .leading, spacing: 3) {
                Text(song.songTitle)
                    .font(.sora(14, .semibold))
                    .foregroundStyle(Color.rbTextPrimary)
                    .lineLimit(1)

                Text(song.artistName)
                    .font(.sora(12))
                    .foregroundStyle(Color.rbTextSecondary)
                    .lineLimit(1)
            }

            Spacer()

            Text("\(song.playCount)")
                .font(.mono(13, .bold))
                .foregroundStyle(Color.rbAccentLight)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(
                    Capsule()
                        .fill(Color.rbAccent.opacity(0.16))
                )
        }
        .padding(.vertical, 8)
    }
}

#Preview {
    NavigationStack {
        StationDashboardView()
    }
    .preferredColorScheme(.dark)
}
