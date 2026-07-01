import SwiftUI

/// Main dashboard for label role users.
/// Shows total plays across all artists, artist summary cards, and catalog songs list.
struct LabelDashboardView: View {
    @State private var viewModel = LabelDashboardViewModel()

    var body: some View {
        ZStack {
            Color.clear
                .onairGlow()

            if viewModel.isLoading && viewModel.dashboard == nil {
                LoadingView()
            } else if let errorMessage = viewModel.error, viewModel.dashboard == nil {
                ErrorView(message: errorMessage) {
                    Task { await viewModel.loadDashboard() }
                }
            } else {
                ScrollView {
                    VStack(spacing: 24) {
                        // Big number: total plays
                        if let dash = viewModel.dashboard {
                            totalPlaysCard(dash.totalPlays)
                        }

                        // Today's report shortcut
                        todayReportCard

                        // Artist summary cards (horizontal scroll)
                        if let artists = viewModel.dashboard?.artistSummaries, !artists.isEmpty {
                            artistSummarySection(artists)
                        }

                        // Catalog songs list
                        if let songs = viewModel.dashboard?.catalogSongs, !songs.isEmpty {
                            catalogSongsSection(songs)
                        }
                    }
                    .padding(.top, 12)
                    .padding(.bottom, 40)
                }
                .refreshable {
                    await viewModel.loadDashboard()
                }
            }
        }
        .navigationTitle("Label Dashboard")
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(Color.rbBackground, for: .navigationBar)
        .preferredColorScheme(.dark)
        .task {
            await viewModel.loadDashboard()
        }
    }

    // MARK: - Total Plays Card

    @ViewBuilder
    private func totalPlaysCard(_ totalPlays: Int) -> some View {
        VStack(spacing: 8) {
            Image(systemName: "waveform.path.ecg")
                .font(.title2)
                .foregroundStyle(Color.rbAccent)

            Text("\(totalPlays)")
                .font(.sora(46, .heavy))
                .foregroundStyle(Color.rbAccent)

            Text("TOTAL PLAYS ACROSS ALL ARTISTS")
                .font(.sora(10, .semibold))
                .tracking(1.4)
                .foregroundStyle(Color.rbTextTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .rbCard(radius: 22)
        .padding(.horizontal, 16)
    }

    // MARK: - Today's Report Card

    /// Shortcut into the daily reports screen (today + history).
    private var todayReportCard: some View {
        NavigationLink {
            DailyReportView()
        } label: {
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.rbAccent.opacity(0.15))
                    .frame(width: 42, height: 42)
                    .overlay {
                        Image(systemName: "doc.text.fill")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(Color.rbAccentLight)
                    }

                VStack(alignment: .leading, spacing: 2) {
                    Text("Today's Report")
                        .font(.sora(14.5, .semibold))
                        .foregroundStyle(Color.rbTextPrimary)
                    Text("Play stats, tips, and insights")
                        .font(.sora(12))
                        .foregroundStyle(Color.rbTextTertiary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.rbTextQuaternary)
            }
            .padding(12)
            .rbCard(radius: 18)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 16)
    }

    // MARK: - Artist Summary Section

    @ViewBuilder
    private func artistSummarySection(_ artists: [LabelArtistDashboardItem]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "person.2.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.rbAccent)

                Text("Your Artists")
                    .font(.sora(16, .bold))
                    .foregroundStyle(Color.rbTextPrimary)

                Spacer()

                Text("\(artists.count) artists")
                    .font(.mono(11))
                    .foregroundStyle(Color.rbTextTertiary)
            }
            .padding(.horizontal, 16)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(artists) { artist in
                        artistSummaryCard(artist)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    private func artistSummaryCard(_ artist: LabelArtistDashboardItem) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                if let urlString = artist.pictureUrl, let url = URL(string: urlString) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .scaledToFill()
                    } placeholder: {
                        ZStack {
                            Circle()
                                .fill(Color.rbSurface)
                            Image(systemName: "person.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(Color.rbTextTertiary)
                        }
                    }
                    .frame(width: 40, height: 40)
                    .clipShape(Circle())
                } else {
                    ZStack {
                        Circle()
                            .fill(Color.rbSurface)
                        Image(systemName: "person.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(Color.rbTextTertiary)
                    }
                    .frame(width: 40, height: 40)
                }

                Text(artist.artistName)
                    .font(.sora(15, .bold))
                    .foregroundStyle(Color.rbTextPrimary)
                    .lineLimit(1)
            }

            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(artist.songCount)")
                        .font(.sora(18, .bold))
                        .foregroundStyle(Color.rbAccent)
                    Text("SONGS")
                        .font(.sora(9, .semibold))
                        .tracking(1.0)
                        .foregroundStyle(Color.rbTextTertiary)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("\(artist.totalPlays)")
                        .font(.sora(18, .bold))
                        .foregroundStyle(Color.rbAccent)
                    Text("PLAYS")
                        .font(.sora(9, .semibold))
                        .tracking(1.0)
                        .foregroundStyle(Color.rbTextTertiary)
                }
            }

            if let topSong = artist.topSong {
                HStack(spacing: 4) {
                    Image(systemName: "crown.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(Color.rbAccent)

                    Text(topSong)
                        .font(.sora(12, .medium))
                        .foregroundStyle(Color.rbTextSecondary)
                        .lineLimit(1)
                }
            }
        }
        .frame(width: 180, alignment: .leading)
        .rbCard(radius: 18)
    }

    // MARK: - Catalog Songs Section

    @ViewBuilder
    private func catalogSongsSection(_ songs: [LabelCatalogSong]) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Image(systemName: "music.note.list")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.rbAccent)

                Text("Catalog")
                    .font(.sora(16, .bold))
                    .foregroundStyle(Color.rbTextPrimary)

                Spacer()

                Text("\(songs.count) songs")
                    .font(.mono(11))
                    .foregroundStyle(Color.rbTextTertiary)
            }
            .padding(.horizontal, 16)

            LazyVStack(spacing: 0) {
                ForEach(Array(songs.enumerated()), id: \.element.id) { index, song in
                    catalogSongRow(song, rank: index + 1)

                    if index < songs.count - 1 {
                        Divider()
                            .overlay(Color.rbHairline)
                            .padding(.leading, 52)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .rbCard(radius: 22)
        .padding(.horizontal, 16)
    }

    private func catalogSongRow(_ song: LabelCatalogSong, rank: Int) -> some View {
        HStack(spacing: 12) {
            Text("\(rank)")
                .font(.mono(14, .medium))
                .foregroundStyle(Color.rbTextTertiary)
                .frame(width: 28, alignment: .trailing)

            VStack(alignment: .leading, spacing: 3) {
                Text(song.songTitle)
                    .font(.sora(14, .semibold))
                    .foregroundStyle(Color.rbTextPrimary)
                    .lineLimit(1)

                Text(song.artistName)
                    .font(.sora(12, .medium))
                    .foregroundStyle(Color.rbTextSecondary)
                    .lineLimit(1)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 3) {
                Text("\(song.totalPlays)")
                    .font(.sora(16, .bold))
                    .foregroundStyle(Color.rbAccent)

                Text("\(song.stationCount) station\(song.stationCount == 1 ? "" : "s")")
                    .font(.mono(10))
                    .foregroundStyle(Color.rbTextTertiary)
            }
        }
        .padding(.vertical, 10)
    }
}

#Preview {
    NavigationStack {
        LabelDashboardView()
    }
    .preferredColorScheme(.dark)
}
