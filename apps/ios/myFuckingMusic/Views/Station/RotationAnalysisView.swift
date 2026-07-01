import SwiftUI
import Charts

/// Rotation analysis showing unique songs per hour, average rotation,
/// and over-rotated songs with warning indicators.
struct RotationAnalysisView: View {
    @State private var viewModel = StationAnalyticsViewModel()

    var body: some View {
        ZStack {
            if viewModel.isLoading && viewModel.rotationAnalysis == nil {
                LoadingView()
            } else if let errorMessage = viewModel.error, viewModel.rotationAnalysis == nil {
                ErrorView(message: errorMessage) {
                    Task { await viewModel.loadRotationAnalysis() }
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

                        if let rotation = viewModel.rotationAnalysis {
                            // Average rotation stat
                            averageRotationCard(rotation.averageRotation)

                            // Hourly chart
                            hourlyChart(rotation.uniqueSongsPerHour)

                            // Over-rotated songs
                            if !rotation.overRotatedSongs.isEmpty {
                                overRotatedSection(rotation.overRotatedSongs)
                            }
                        }
                    }
                    .padding(.top, 8)
                    .padding(.bottom, 40)
                }
                .refreshable {
                    await viewModel.loadRotationAnalysis()
                }
            }
        }
        .onairGlow(subtle: true)
        .navigationTitle("Rotation Analysis")
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(Color.rbBackground, for: .navigationBar)
        .preferredColorScheme(.dark)
        .task(id: viewModel.selectedPeriod) {
            await viewModel.loadRotationAnalysis()
        }
    }

    // MARK: - Average Rotation Card

    @ViewBuilder
    private func averageRotationCard(_ average: Double) -> some View {
        VStack(spacing: 8) {
            Image(systemName: "arrow.triangle.2.circlepath")
                .font(.title2)
                .foregroundStyle(Color.rbAccent)

            Text(String(format: "%.1f", average))
                .font(.sora(42, .heavy))
                .foregroundStyle(LinearGradient.rbAccentGradient)

            Text("AVG. UNIQUE SONGS / HOUR")
                .font(.sora(10, .semibold))
                .tracking(1.4)
                .foregroundStyle(Color.rbTextTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .rbCard()
        .padding(.horizontal, 16)
    }

    // MARK: - Hourly Chart

    @ViewBuilder
    private func hourlyChart(_ buckets: [HourBucket]) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Image(systemName: "chart.bar.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.rbAccent)

                Text("Unique Songs per Hour")
                    .font(.sora(16, .bold))
                    .foregroundStyle(Color.rbTextPrimary)
            }

            Chart(buckets) { bucket in
                BarMark(
                    x: .value("Hour", formatHour(bucket.hour)),
                    y: .value("Songs", bucket.count)
                )
                .foregroundStyle(
                    LinearGradient(
                        colors: [Color(hex: "7C5CF6"), Color(hex: "B84DF0")],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .cornerRadius(4)
            }
            .chartXAxis {
                AxisMarks(values: .automatic(desiredCount: 8)) { _ in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                        .foregroundStyle(Color.rbHairline)
                    AxisValueLabel()
                        .foregroundStyle(Color.rbTextSecondary)
                        .font(.mono(9))
                }
            }
            .chartYAxis {
                AxisMarks { _ in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                        .foregroundStyle(Color.rbHairline)
                    AxisValueLabel()
                        .foregroundStyle(Color.rbTextSecondary)
                        .font(.mono(9))
                }
            }
            .frame(height: 200)
        }
        .rbCard()
        .padding(.horizontal, 16)
    }

    // MARK: - Over-Rotated Songs

    @ViewBuilder
    private func overRotatedSection(_ songs: [OverRotatedSong]) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.rbWarning)

                Text("Over-Rotated Songs")
                    .font(.sora(16, .bold))
                    .foregroundStyle(Color.rbTextPrimary)

                Spacer()

                Text("\(songs.count) songs")
                    .font(.mono(11))
                    .foregroundStyle(Color.rbTextTertiary)
            }

            LazyVStack(spacing: 0) {
                ForEach(songs) { song in
                    HStack(spacing: 12) {
                        // Warning indicator
                        Image(systemName: "exclamationmark.circle.fill")
                            .font(.system(size: 18))
                            .foregroundStyle(Color.rbWarning)

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

                        VStack(alignment: .trailing, spacing: 2) {
                            Text("\(song.playCount) plays")
                                .font(.mono(12, .bold))
                                .foregroundStyle(Color.rbWarning)

                            Text("max \(song.expectedMax)")
                                .font(.mono(10))
                                .foregroundStyle(Color.rbTextTertiary)
                        }
                    }
                    .padding(.vertical, 8)

                    if song.id != songs.last?.id {
                        Divider()
                            .overlay(Color.rbHairline)
                            .padding(.leading, 30)
                    }
                }
            }
        }
        .rbCard()
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .strokeBorder(Color.rbWarning.opacity(0.3), lineWidth: 1)
        )
        .padding(.horizontal, 16)
    }

    // MARK: - Helpers

    private func formatHour(_ hour: Int) -> String {
        let h = hour % 24
        if h == 0 { return "12a" }
        if h < 12 { return "\(h)a" }
        if h == 12 { return "12p" }
        return "\(h - 12)p"
    }
}

#Preview {
    NavigationStack {
        RotationAnalysisView()
    }
    .preferredColorScheme(.dark)
}
