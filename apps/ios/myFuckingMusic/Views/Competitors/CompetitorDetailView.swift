import SwiftUI

/// Detail view for a single competitor station.
/// Shows top songs, recent detections, and play count comparison.
/// Day/Week/Month segmented control switches the data period.
struct CompetitorDetailView: View {
    let stationId: Int
    let stationName: String

    @State private var viewModel: CompetitorDetailViewModel

    init(stationId: Int, stationName: String) {
        self.stationId = stationId
        self.stationName = stationName
        self._viewModel = State(initialValue: CompetitorDetailViewModel(
            stationId: stationId,
            stationName: stationName
        ))
    }

    var body: some View {
        ZStack {
            if viewModel.isLoading && viewModel.detail == nil {
                LoadingView()
            } else if let errorMessage = viewModel.error, viewModel.detail == nil {
                ErrorView(message: errorMessage) {
                    Task { await viewModel.loadDetail() }
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
                        .padding(.horizontal)
                        .colorMultiply(.rbAccent)

                        if let detail = viewModel.detail {
                            // Top Songs section
                            topSongsSection(detail.topSongs)

                            // Recent Detections section
                            recentDetectionsSection(detail.recentDetections)

                            // Play Count Comparison section
                            comparisonSection(detail.comparison)
                        }
                    }
                    .padding(.vertical)
                }
                .refreshable {
                    await viewModel.loadDetail()
                }
            }
        }
        .onairGlow(subtle: true)
        .navigationTitle(stationName)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(Color.rbBackground, for: .navigationBar)
        .preferredColorScheme(.dark)
        .task(id: viewModel.selectedPeriod) {
            await viewModel.loadDetail()
        }
    }

    // MARK: - Top Songs Section

    @ViewBuilder
    private func topSongsSection(_ songs: [CompetitorSong]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Top Songs")
                .font(.sora(16, .bold))
                .foregroundStyle(Color.rbTextPrimary)

            if songs.isEmpty {
                Text("No songs detected")
                    .font(.sora(14))
                    .foregroundStyle(Color.rbTextSecondary)
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(Array(songs.enumerated()), id: \.element.id) { index, song in
                        HStack(spacing: 12) {
                            Text("\(index + 1)")
                                .font(.mono(15, .bold))
                                .foregroundStyle(index < 3 ? Color.rbWarm : Color.rbTextTertiary)
                                .frame(width: 30, alignment: .trailing)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(song.title)
                                    .font(.sora(14, .semibold))
                                    .foregroundStyle(Color.rbTextPrimary)
                                    .lineLimit(1)
                                Text(song.artist)
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
                                .background(Capsule().fill(Color.rbAccent.opacity(0.16)))
                        }
                        .padding(.vertical, 8)

                        if index < songs.count - 1 {
                            Divider()
                                .overlay(Color.rbHairline)
                                .padding(.leading, 42)
                        }
                    }
                }
            }
        }
        .rbCard()
        .padding(.horizontal, 16)
    }

    // MARK: - Recent Detections Section

    @ViewBuilder
    private func recentDetectionsSection(_ detections: [CompetitorDetection]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Detections")
                .font(.sora(16, .bold))
                .foregroundStyle(Color.rbTextPrimary)

            if detections.isEmpty {
                Text("No recent detections")
                    .font(.sora(14))
                    .foregroundStyle(Color.rbTextSecondary)
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(Array(detections.prefix(20).enumerated()), id: \.element.id) { index, detection in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(detection.songTitle)
                                    .font(.sora(14, .semibold))
                                    .foregroundStyle(Color.rbTextPrimary)
                                    .lineLimit(1)
                                Text(detection.artistName)
                                    .font(.sora(12))
                                    .foregroundStyle(Color.rbTextSecondary)
                                    .lineLimit(1)
                            }

                            Spacer()

                            Text(formatDetectionTime(detection.startedAt))
                                .font(.mono(11))
                                .foregroundStyle(Color.rbTextTertiary)
                        }
                        .padding(.vertical, 8)

                        if index < min(detections.count, 20) - 1 {
                            Divider()
                                .overlay(Color.rbHairline)
                        }
                    }
                }
            }
        }
        .rbCard()
        .padding(.horizontal, 16)
    }

    // MARK: - Play Count Comparison Section

    @ViewBuilder
    private func comparisonSection(_ comparisons: [CompetitorComparison]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Play Count Comparison")
                .font(.sora(16, .bold))
                .foregroundStyle(Color.rbTextPrimary)

            if comparisons.isEmpty {
                Text("No overlapping songs")
                    .font(.sora(14))
                    .foregroundStyle(Color.rbTextSecondary)
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(Array(comparisons.enumerated()), id: \.element.id) { index, comparison in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(comparison.songTitle)
                                    .font(.sora(14, .semibold))
                                    .foregroundStyle(Color.rbTextPrimary)
                                    .lineLimit(1)
                                Text(comparison.artistName)
                                    .font(.sora(12))
                                    .foregroundStyle(Color.rbTextSecondary)
                                    .lineLimit(1)
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: 2) {
                                Text("Theirs: \(comparison.theirPlays)")
                                    .font(.mono(11, .medium))
                                    .foregroundStyle(comparison.theirPlays > comparison.yourPlays ? Color.rbWarm : Color.rbTextTertiary)

                                Text("Yours: \(comparison.yourPlays)")
                                    .font(.mono(11, .medium))
                                    .foregroundStyle(comparison.yourPlays > comparison.theirPlays ? Color.rbLive : Color.rbTextTertiary)
                            }
                        }
                        .padding(.vertical, 8)

                        if index < comparisons.count - 1 {
                            Divider()
                                .overlay(Color.rbHairline)
                        }
                    }
                }
            }
        }
        .rbCard()
        .padding(.horizontal, 16)
    }

    // MARK: - Helpers

    /// Format an ISO date string to a short time display.
    private func formatDetectionTime(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) {
            return DateFormatters.shortDateTime(date)
        }
        // Try without fractional seconds
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: isoString) {
            return DateFormatters.shortDateTime(date)
        }
        return isoString
    }
}

#Preview {
    NavigationStack {
        CompetitorDetailView(stationId: 1, stationName: "Radio ZU")
    }
}
