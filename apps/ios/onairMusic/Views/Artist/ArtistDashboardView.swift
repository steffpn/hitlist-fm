import SwiftUI

/// Main dashboard for artist role users.
/// Shows today/weekly play counts, most played song, and weekly digest.
struct ArtistDashboardView: View {
    @State private var viewModel = ArtistDashboardViewModel()
    @Environment(AuthManager.self) private var authManager

    var body: some View {
        ZStack {
            if viewModel.isLoading && viewModel.dashboard == nil {
                LoadingView()
            } else if let errorMessage = viewModel.error, viewModel.dashboard == nil {
                ErrorView(message: errorMessage) {
                    Task { await viewModel.loadDashboard() }
                }
            } else {
                ScrollView {
                    VStack(spacing: 14) {
                        topBar

                        Text("Dashboard")
                            .font(.sora(30, .bold))
                            .tracking(-0.6)
                            .foregroundStyle(Color.rbTextPrimary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.top, 2)

                        // Airplay gauge hero — merges Plays Today + Plays This Week.
                        if let dash = viewModel.dashboard {
                            airplayGaugeCard(dash)
                        }

                        // Most played song
                        if let song = viewModel.dashboard?.mostPlayedSong {
                            mostPlayedCard(song)
                        }

                        // Weekly digest
                        if let digest = viewModel.weeklyDigest, !digest.songs.isEmpty {
                            weeklyDigestSection(digest)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 40)
                }
                .refreshable {
                    await viewModel.loadDashboard()
                    await viewModel.loadWeeklyDigest()
                }
            }
        }
        .onairGlow()
        .navigationBarHidden(true)
        .preferredColorScheme(.dark)
        .task {
            await viewModel.loadDashboard()
            await viewModel.loadWeeklyDigest()
        }
    }

    // MARK: - Top Bar

    /// Custom top bar replacing the large nav title: left wordmark, right a glass
    /// LIVE pill + circular gradient avatar with the user's initial.
    private var topBar: some View {
        HStack(spacing: 10) {
            HStack(spacing: 0) {
                Text("onair")
                    .foregroundStyle(Color.rbTextPrimary)
                Text(".")
                    .foregroundStyle(Color.rbAccent)
                Text("music")
                    .foregroundStyle(Color.rbTextTertiary)
            }
            .font(.sora(20, .bold))
            .tracking(-0.4)

            Spacer()

            HStack(spacing: 5) {
                Circle()
                    .fill(Color.rbLive)
                    .frame(width: 6, height: 6)
                    .rbLivePulse()

                Text("LIVE")
                    .font(.sora(10, .semibold))
                    .tracking(1.2)
                    .foregroundStyle(Color.rbAccentLight)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(.ultraThinMaterial, in: Capsule())
            .overlay(Capsule().strokeBorder(Color.rbGlassBorder, lineWidth: 1))

            Circle()
                .fill(Color.rbAccent)
                .frame(width: 34, height: 34)
                .overlay {
                    Text(avatarInitial)
                        .font(.sora(15, .bold))
                        .foregroundStyle(.white)
                }
        }
        .padding(.top, 8)
    }

    /// First letter of the signed-in user's name (falls back to a music glyph letter).
    private var avatarInitial: String {
        let name = authManager.currentUser?.name ?? ""
        return name.first.map { String($0).uppercased() } ?? "♪"
    }

    // MARK: - Airplay Gauge Card (hero)

    @ViewBuilder
    private func airplayGaugeCard(_ dash: ArtistDashboardResponse) -> some View {
        // Gauge fill: today relative to weekly volume (no "personal best" field exists).
        let fraction = min(Double(dash.totalPlaysToday) / Double(max(dash.totalPlaysWeek, 1)), 1)
        // Trend pill: today vs this week's daily average (derived only from existing data).
        let dailyAvg = Double(dash.totalPlaysWeek) / 7.0
        let deltaPercent: Int = dailyAvg > 0
            ? Int(((Double(dash.totalPlaysToday) - dailyAvg) / dailyAvg * 100).rounded())
            : 0

        HStack(spacing: 18) {
            AirplayGauge(value: dash.totalPlaysToday, fraction: fraction)

            VStack(alignment: .leading, spacing: 6) {
                Text("AIRPLAY")
                    .font(.sora(10, .semibold))
                    .tracking(1.4)
                    .foregroundStyle(Color.rbTextTertiary)

                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("\(dash.totalPlaysWeek)")
                        .font(.sora(30, .heavy))
                        .foregroundStyle(Color.rbAccent)

                    Text("this week")
                        .font(.sora(13, .medium))
                        .foregroundStyle(Color.rbTextSecondary)
                }

                trendPill(delta: deltaPercent)
            }

            Spacer(minLength: 0)
        }
        .rbGlassCard(radius: 22)
    }

    /// Green up / gray flat trend pill on a tinted background.
    private func trendPill(delta: Int) -> some View {
        let isUp = delta >= 0
        let color: Color = isUp ? .rbSuccess : .rbTextTertiary
        return HStack(spacing: 4) {
            Image(systemName: isUp ? "arrowtriangle.up.fill" : "arrowtriangle.down.fill")
                .font(.system(size: 8, weight: .bold))
            Text("\(abs(delta))% vs daily avg")
                .font(.sora(11, .semibold))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(Capsule().fill(color.opacity(0.16)))
    }

    // MARK: - Most Played Card

    @ViewBuilder
    private func mostPlayedCard(_ song: MostPlayedSongInfo) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "crown.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(Color.rbAccent)

                Text("MOST PLAYED")
                    .font(.sora(10, .semibold))
                    .tracking(1.4)
                    .foregroundStyle(Color.rbTextTertiary)
            }

            HStack(spacing: 14) {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(Color.rbAccent.opacity(0.15))
                    .frame(width: 52, height: 52)
                    .overlay {
                        Image(systemName: "music.note")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(Color.rbAccentLight)
                    }

                VStack(alignment: .leading, spacing: 3) {
                    Text(song.title)
                        .font(.sora(15, .bold))
                        .foregroundStyle(Color.rbTextPrimary)
                        .lineLimit(1)

                    Text(song.artist)
                        .font(.sora(13, .regular))
                        .foregroundStyle(Color.rbTextSecondary)
                        .lineLimit(1)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(song.plays)")
                        .font(.sora(22, .heavy))
                        .foregroundStyle(Color.rbAccent)

                    Text("plays")
                        .font(.sora(10, .medium))
                        .foregroundStyle(Color.rbTextTertiary)
                }
            }
        }
        .rbCard(radius: 22)
    }

    // MARK: - Weekly Digest Section

    @ViewBuilder
    private func weeklyDigestSection(_ digest: WeeklyDigestResponse) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.rbAccent)

                Text("Weekly report")
                    .font(.sora(16, .bold))
                    .foregroundStyle(Color.rbTextPrimary)

                Spacer()

                Text("\(digest.songs.count) songs")
                    .font(.mono(11, .regular))
                    .foregroundStyle(Color.rbTextTertiary)
            }

            ForEach(digest.songs) { item in
                digestRow(item)
            }
        }
        .rbCard(radius: 22)
    }

    private func digestRow(_ item: SongDigestItem) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(item.songTitle)
                        .font(.sora(14, .medium))
                        .foregroundStyle(Color.rbTextPrimary)
                        .lineLimit(1)

                    HStack(spacing: 6) {
                        Text("\(item.playsThisWeek) plays")
                            .font(.sora(12, .regular))
                            .foregroundStyle(Color.rbTextSecondary)

                        TrendBadge(
                            direction: item.direction,
                            percentChange: item.percentChange,
                            compact: true
                        )
                    }
                }

                Spacer()

                Text("\(item.playsThisWeek)")
                    .font(.sora(18, .heavy))
                    .foregroundStyle(Color.rbAccent)
            }

            if !item.newStations.isEmpty {
                HStack(spacing: 4) {
                    Image(systemName: "antenna.radiowaves.left.and.right")
                        .font(.system(size: 9))
                        .foregroundStyle(Color.rbAccent)

                    Text("New on: \(item.newStations.joined(separator: ", "))")
                        .font(.sora(11, .medium))
                        .foregroundStyle(Color.rbAccentLight)
                        .lineLimit(1)
                }
            }

            Divider()
                .overlay(Color.rbHairline)
        }
    }
}

#Preview {
    NavigationStack {
        ArtistDashboardView()
    }
    .environment(AuthManager())
    .preferredColorScheme(.dark)
}
