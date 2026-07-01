import SwiftUI
import Charts

/// Compare 2-3 artists side-by-side with play count charts.
/// Multi-select list at top, compare button, and chart overlay.
struct ArtistComparisonView: View {
    @State private var viewModel = ArtistComparisonViewModel()
    @State private var artistListViewModel = LabelArtistListViewModel()

    /// Color palette for artist series differentiation — on-brand violet family.
    private let seriesColors: [Color] = [
        .rbAccent,
        .rbAccentGradEnd,
        .rbAccentLight
    ]

    var body: some View {
        ZStack {
            Color.clear
                .onairGlow(subtle: true)

            ScrollView {
                VStack(spacing: 20) {
                    // Artist selector
                    artistSelector

                    // Compare button
                    compareButton

                    // Error display
                    if let errorMessage = viewModel.error {
                        Text(errorMessage)
                            .font(.sora(12, .medium))
                            .foregroundStyle(Color.rbError)
                            .padding(.horizontal, 16)
                    }

                    // Loading state
                    if viewModel.isLoading {
                        ProgressView()
                            .tint(Color.rbAccent)
                            .padding(.top, 20)
                    }

                    // Chart
                    if let comparison = viewModel.comparisonData {
                        comparisonChart(comparison)
                    }
                }
                .padding(.top, 12)
                .padding(.bottom, 40)
            }
        }
        .navigationTitle("Compare Artists")
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(Color.rbBackground, for: .navigationBar)
        .preferredColorScheme(.dark)
        .task {
            await artistListViewModel.loadArtists()
        }
    }

    // MARK: - Artist Selector

    private var artistSelector: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "person.2.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.rbAccent)

                Text("Select Artists")
                    .font(.sora(16, .bold))
                    .foregroundStyle(Color.rbTextPrimary)

                Spacer()

                Text("\(viewModel.selectedArtistIds.count)/3 selected")
                    .font(.mono(11))
                    .foregroundStyle(
                        viewModel.selectedArtistIds.count >= 2
                            ? Color.rbAccent
                            : Color.rbTextTertiary
                    )
            }

            LazyVStack(spacing: 0) {
                ForEach(artistListViewModel.artists) { artist in
                    let isSelected = viewModel.selectedArtistIds.contains(artist.id)

                    Button {
                        toggleArtistSelection(artist.id)
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 20))
                                .foregroundStyle(isSelected ? Color.rbAccent : Color.rbTextTertiary)

                            Text(artist.artistName)
                                .font(.sora(14, .medium))
                                .foregroundStyle(Color.rbTextPrimary)

                            Spacer()

                            Text("\(artist.totalPlays) plays")
                                .font(.mono(11))
                                .foregroundStyle(Color.rbTextSecondary)
                        }
                        .padding(.vertical, 10)
                        .padding(.horizontal, 4)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)

                    if artist.id != artistListViewModel.artists.last?.id {
                        Divider()
                            .overlay(Color.rbHairline)
                    }
                }
            }
        }
        .rbCard(radius: 18)
        .padding(.horizontal, 16)
    }

    // MARK: - Compare Button

    private var compareButton: some View {
        Button {
            Task { await viewModel.loadComparison() }
        } label: {
            HStack {
                Image(systemName: "chart.bar.xaxis")
                Text("Compare")
            }
            .font(.sora(16, .bold))
            .foregroundStyle(viewModel.selectedArtistIds.count >= 2 ? .white : Color.rbTextTertiary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(
                        viewModel.selectedArtistIds.count >= 2
                            ? AnyShapeStyle(LinearGradient.rbAccentGradient)
                            : AnyShapeStyle(Color.rbSurfaceLight)
                    )
            )
        }
        .disabled(viewModel.selectedArtistIds.count < 2)
        .padding(.horizontal, 16)
    }

    // MARK: - Comparison Chart

    @ViewBuilder
    private func comparisonChart(_ comparison: ArtistComparisonResponse) -> some View {
        ComparisonChartCard(comparison: comparison, seriesColors: seriesColors)
            .padding(.horizontal, 16)
    }

    private func toggleArtistSelection(_ artistId: Int) {
        if let idx = viewModel.selectedArtistIds.firstIndex(of: artistId) {
            viewModel.selectedArtistIds.remove(at: idx)
        } else if viewModel.selectedArtistIds.count < 3 {
            viewModel.selectedArtistIds.append(artistId)
        }
    }
}

// MARK: - Extracted Chart Card (fixes type-checker timeout)

private struct ComparisonChartCard: View {
    let comparison: ArtistComparisonResponse
    let seriesColors: [Color]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            chartHeader
            chartContent
            chartLegend
        }
        .rbCard(radius: 22)
    }

    private var chartHeader: some View {
        HStack {
            Image(systemName: "chart.bar.fill")
                .font(.system(size: 14))
                .foregroundStyle(Color.rbAccent)
            Text("Daily Plays Comparison")
                .font(.sora(16, .bold))
                .foregroundStyle(Color.rbTextPrimary)
        }
    }

    private var chartContent: some View {
        Chart {
            ForEach(comparison.artists) { artist in
                let days = Array(artist.dailyPlays.suffix(7))
                ForEach(days) { day in
                    BarMark(
                        x: .value("Date", dayLabel(day.date)),
                        y: .value("Plays", day.count)
                    )
                    .foregroundStyle(by: .value("Artist", artist.artistName))
                    .position(by: .value("Artist", artist.artistName))
                    .cornerRadius(4)
                }
            }
        }
        .chartForegroundStyleScale(
            domain: comparison.artists.map(\.artistName),
            range: Array(seriesColors.prefix(comparison.artists.count))
        )
        .chartLegend(.hidden)
        .chartXAxis {
            AxisMarks { _ in
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
        .frame(height: 260)
    }

    private var chartLegend: some View {
        HStack(spacing: 16) {
            ForEach(Array(comparison.artists.enumerated()), id: \.element.id) { index, artist in
                HStack(spacing: 6) {
                    Circle()
                        .fill(seriesColors[index % seriesColors.count])
                        .frame(width: 10, height: 10)
                    Text(artist.artistName)
                        .font(.sora(11, .medium))
                        .foregroundStyle(Color.rbTextSecondary)
                        .lineLimit(1)
                }
            }
        }
    }

    private func dayLabel(_ dateString: String) -> String {
        let parts = dateString.split(separator: "-")
        if parts.count == 3 { return String(parts[2]) }
        return String(dateString.suffix(2))
    }
}

#Preview {
    NavigationStack {
        ArtistComparisonView()
    }
    .preferredColorScheme(.dark)
}
