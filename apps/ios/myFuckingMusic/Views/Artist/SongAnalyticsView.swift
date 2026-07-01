import SwiftUI

/// Detailed analytics view for a single monitored song.
/// Shows daily play chart, station breakdown, heatmap, peak hours, and trend info.
struct SongAnalyticsView: View {
    let song: MonitoredSong
    @State private var viewModel = SongAnalyticsViewModel()
    @State private var appearAnimation = false

    var body: some View {
        ZStack {
            Color.clear
                .onairGlow()
                .ignoresSafeArea()

            if viewModel.isLoading && viewModel.analytics == nil {
                LoadingView()
            } else if let errorMessage = viewModel.error, viewModel.analytics == nil {
                ErrorView(message: errorMessage) {
                    Task { await viewModel.loadAllAnalytics(songId: song.id) }
                }
            } else {
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 20) {
                        // Song header
                        songHeader
                            .padding(.top, 12)

                        // Stats summary
                        if let analytics = viewModel.analytics {
                            statsRow(analytics)
                        }

                        // Daily plays chart
                        if let analytics = viewModel.analytics, !analytics.dailyPlays.isEmpty {
                            BarChartView(
                                data: analytics.dailyPlays,
                                accentColor: .rbAccent,
                                title: "Daily Plays"
                            )
                        }

                        // Station breakdown
                        if !viewModel.stationBreakdown.isEmpty {
                            StationBreakdownView(stations: viewModel.stationBreakdown)
                        }

                        // Heatmap
                        if let heatmap = viewModel.heatmap {
                            HourlyHeatmapView(
                                heatmap: heatmap,
                                accentColor: .rbAccent
                            )
                        }

                        // Peak hours
                        if !viewModel.peakHours.isEmpty {
                            peakHoursSection
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 40)
                }
                .refreshable {
                    await viewModel.loadAllAnalytics(songId: song.id)
                }
            }
        }
        .navigationTitle("Song Analytics")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(Color.rbBackground, for: .navigationBar)
        .preferredColorScheme(.dark)
        .task {
            await viewModel.loadAllAnalytics(songId: song.id)
            withAnimation(.easeOut(duration: 0.5)) {
                appearAnimation = true
            }
        }
    }

    // MARK: - Song Header

    private var songHeader: some View {
        VStack(spacing: 16) {
            // Album art placeholder (gradient — 184pt hero per spec 3d)
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(LinearGradient.rbAccentGradient)
                .frame(width: 184, height: 184)
                .overlay {
                    Image(systemName: "music.note")
                        .font(.system(size: 46, weight: .light))
                        .foregroundStyle(.white.opacity(0.9))
                }
                .shadow(color: Color(hex: "7C5CF6").opacity(0.55), radius: 30, x: 0, y: 14)
                .shadow(color: .black.opacity(0.35), radius: 20, x: 0, y: 10)
                .scaleEffect(appearAnimation ? 1.0 : 0.9)
                .opacity(appearAnimation ? 1.0 : 0.0)

            VStack(spacing: 6) {
                Text(song.songTitle)
                    .font(.sora(22, .bold))
                    .foregroundStyle(Color.rbTextPrimary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)

                Text(song.artistName)
                    .font(.sora(16, .medium))
                    .foregroundStyle(Color.rbTextSecondary)

                HStack(spacing: 8) {
                    Text(song.isrc)
                        .font(.mono(12))
                        .foregroundStyle(Color.rbTextQuaternary)

                    if let trend = song.trend {
                        TrendBadge(
                            direction: trend.direction,
                            percentChange: trend.percentChange
                        )
                    }
                }
            }
            .opacity(appearAnimation ? 1.0 : 0.0)
            .offset(y: appearAnimation ? 0 : 8)
        }
    }

    // MARK: - Stats Row

    private func statsRow(_ analytics: SongAnalyticsResponse) -> some View {
        HStack(spacing: 0) {
            statItem(
                value: "\(analytics.totalPlays)",
                label: "Total Plays",
                icon: "play.fill"
            )

            Divider()
                .frame(height: 40)
                .overlay(Color.rbHairline)

            statItem(
                value: "\(analytics.stationCount)",
                label: "Stations",
                icon: "antenna.radiowaves.left.and.right"
            )

            Divider()
                .frame(height: 40)
                .overlay(Color.rbHairline)

            if let trend = viewModel.trend {
                statItem(
                    value: "\(trend.thisWeek)",
                    label: "This Week",
                    icon: "calendar"
                )
            } else {
                statItem(
                    value: "--",
                    label: "This Week",
                    icon: "calendar"
                )
            }
        }
        .rbCard(radius: 20)
        .opacity(appearAnimation ? 1.0 : 0.0)
        .offset(y: appearAnimation ? 0 : 12)
    }

    private func statItem(value: String, label: String, icon: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(Color.rbAccent)

            Text(value)
                .font(.sora(24, .heavy))
                .foregroundStyle(LinearGradient.rbAccentGradient)

            Text(label.uppercased())
                .font(.sora(10, .semibold))
                .tracking(1.4)
                .foregroundStyle(Color.rbTextTertiary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Peak Hours Section

    private var peakHoursSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "clock.badge.checkmark")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.rbWarm)

                Text("Peak Hours")
                    .font(.sora(16, .bold))
                    .foregroundStyle(Color.rbTextPrimary)
            }

            Text("When your song gets the most airplay")
                .font(.sora(12))
                .foregroundStyle(Color.rbTextTertiary)

            let topSlots = Array(viewModel.peakHours.prefix(5))
            ForEach(Array(topSlots.enumerated()), id: \.element.id) { index, slot in
                peakHourRow(slot, rank: index + 1)
            }
        }
        .rbCard(radius: 20)
    }

    private func peakHourRow(_ slot: PeakHourSlot, rank: Int) -> some View {
        HStack(spacing: 12) {
            // Rank circle
            Text("\(rank)")
                .font(.mono(12, .medium))
                .foregroundStyle(rank <= 3 ? Color.rbWarm : Color.rbTextTertiary)
                .frame(width: 28, height: 28)
                .background(
                    Circle()
                        .fill(rank <= 3 ? Color.rbWarm.opacity(0.15) : Color.rbSurfaceLight.opacity(0.3))
                )

            // Time slot info
            VStack(alignment: .leading, spacing: 2) {
                Text(slot.label)
                    .font(.sora(14, .medium))
                    .foregroundStyle(Color.rbTextPrimary)

                Text(formatHour(slot.hour))
                    .font(.sora(12))
                    .foregroundStyle(Color.rbTextTertiary)
            }

            Spacer()

            // Play count
            HStack(spacing: 4) {
                Image(systemName: "play.fill")
                    .font(.system(size: 8))
                    .foregroundStyle(Color.rbAccent)

                Text("\(slot.plays)")
                    .font(.mono(13, .medium))
                    .foregroundStyle(Color.rbAccent)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(
                Capsule()
                    .fill(Color.rbAccent.opacity(0.12))
            )
        }
        .padding(.vertical, 4)
    }

    // MARK: - Helpers

    private func formatHour(_ hour: Int) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        var components = DateComponents()
        components.hour = hour
        if let date = Calendar.current.date(from: components) {
            formatter.dateFormat = "h:mm a"
            return formatter.string(from: date)
        }
        return "\(hour):00"
    }
}

#Preview {
    NavigationStack {
        SongAnalyticsView(
            song: MonitoredSong(
                id: 1,
                songTitle: "Blinding Lights",
                artistName: "The Weeknd",
                isrc: "USUG12000497",
                activatedAt: Date(),
                expiresAt: nil,
                status: "active",
                totalPlays: 142,
                stationCount: 8,
                trend: SongTrend(
                    percentChange: 23.7,
                    direction: "up",
                    thisWeek: 47,
                    lastWeek: 38
                )
            )
        )
    }
    .preferredColorScheme(.dark)
}
