import SwiftUI

/// Playlist overlap analysis with competitor stations.
/// Shows overlap percentage as circular progress and shared songs on expand.
struct PlaylistOverlapView: View {
    @State private var viewModel = StationAnalyticsViewModel()
    @State private var competitorViewModel = CompetitorListViewModel()
    @State private var expandedStationId: Int?

    var body: some View {
        ZStack {
            if competitorViewModel.isLoading && competitorViewModel.cards.isEmpty {
                LoadingView()
            } else if competitorViewModel.cards.isEmpty {
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

                        LazyVStack(spacing: 12) {
                            ForEach(competitorViewModel.cards) { card in
                                competitorOverlapCard(card)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 40)
                    }
                }
                .refreshable {
                    await competitorViewModel.loadSummary()
                }
            }
        }
        .onairGlow(subtle: true)
        .navigationTitle("Playlist Overlap")
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(Color.rbBackground, for: .navigationBar)
        .preferredColorScheme(.dark)
        .task {
            await competitorViewModel.loadSummary()
        }
    }

    // MARK: - Competitor Overlap Card

    @ViewBuilder
    private func competitorOverlapCard(_ card: CompetitorCard) -> some View {
        let isExpanded = expandedStationId == card.stationId

        VStack(spacing: 0) {
            // Header row
            Button {
                withAnimation(.easeInOut(duration: 0.25)) {
                    if isExpanded {
                        expandedStationId = nil
                    } else {
                        expandedStationId = card.stationId
                        Task { await viewModel.loadPlaylistOverlap(competitorId: card.stationId) }
                    }
                }
            } label: {
                HStack(spacing: 14) {
                    // Circular overlap indicator
                    overlapCircle(
                        percent: viewModel.overlap != nil && isExpanded
                            ? viewModel.overlap!.overlapPercent
                            : 0
                    )

                    VStack(alignment: .leading, spacing: 4) {
                        Text(card.stationName)
                            .font(.sora(15, .semibold))
                            .foregroundStyle(Color.rbTextPrimary)

                        if isExpanded, let overlap = viewModel.overlap {
                            Text("\(overlap.sharedCount) shared songs")
                                .font(.sora(12))
                                .foregroundStyle(Color.rbTextSecondary)
                        } else {
                            Text("\(card.playCount) plays")
                                .font(.sora(12))
                                .foregroundStyle(Color.rbTextSecondary)
                        }
                    }

                    Spacer()

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundStyle(Color.rbTextTertiary)
                }
                .padding(14)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            // Expanded content: shared songs list
            if isExpanded {
                if viewModel.isLoading {
                    ProgressView()
                        .tint(Color.rbAccent)
                        .padding()
                } else if let overlap = viewModel.overlap {
                    Divider()
                        .overlay(Color.rbHairline)

                    // Overlap stats
                    HStack(spacing: 20) {
                        overlapStat(
                            label: "Overlap",
                            value: String(format: "%.0f%%", overlap.overlapPercent)
                        )
                        overlapStat(
                            label: "Only You",
                            value: "\(overlap.exclusiveToYou)"
                        )
                        overlapStat(
                            label: "Only Them",
                            value: "\(overlap.exclusiveToThem)"
                        )
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)

                    if !overlap.sharedSongs.isEmpty {
                        Divider()
                            .overlay(Color.rbHairline)

                        VStack(spacing: 0) {
                            ForEach(overlap.sharedSongs.prefix(10)) { song in
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(song.songTitle)
                                            .font(.sora(12, .medium))
                                            .foregroundStyle(Color.rbTextPrimary)
                                            .lineLimit(1)

                                        Text(song.artistName)
                                            .font(.sora(11))
                                            .foregroundStyle(Color.rbTextTertiary)
                                            .lineLimit(1)
                                    }

                                    Spacer()

                                    VStack(alignment: .trailing, spacing: 1) {
                                        Text("You: \(song.yourPlays)")
                                            .font(.mono(11, .medium))
                                            .foregroundStyle(
                                                song.yourPlays >= song.theirPlays
                                                    ? Color.rbAccentLight
                                                    : Color.rbTextSecondary
                                            )
                                        Text("Them: \(song.theirPlays)")
                                            .font(.mono(11, .medium))
                                            .foregroundStyle(
                                                song.theirPlays > song.yourPlays
                                                    ? Color.rbWarm
                                                    : Color.rbTextSecondary
                                            )
                                    }
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 6)
                            }
                        }
                    }
                }
            }
        }
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Color.rbGlassTint))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(Color.rbGlassBorder, lineWidth: 1)
        )
    }

    // MARK: - Circular Overlap Indicator

    private func overlapCircle(percent: Double) -> some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.10), lineWidth: 4)

            Circle()
                .trim(from: 0, to: CGFloat(min(percent, 100.0) / 100.0))
                .stroke(
                    LinearGradient(
                        colors: [Color(hex: "7C5CF6"), Color(hex: "B84DF0")],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    style: StrokeStyle(lineWidth: 4, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            Text(String(format: "%.0f%%", percent))
                .font(.mono(10, .bold))
                .foregroundStyle(Color.rbTextPrimary)
        }
        .frame(width: 44, height: 44)
    }

    private func overlapStat(label: String, value: String) -> some View {
        VStack(spacing: 3) {
            Text(value)
                .font(.sora(16, .bold))
                .foregroundStyle(LinearGradient.rbAccentGradient)

            Text(label.uppercased())
                .font(.sora(9, .semibold))
                .tracking(1.2)
                .foregroundStyle(Color.rbTextTertiary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "arrow.triangle.2.circlepath")
                .font(.system(size: 48))
                .foregroundStyle(Color.rbTextTertiary)

            Text("No Competitors Added")
                .font(.sora(20, .semibold))
                .foregroundStyle(Color.rbTextPrimary)

            Text("Add competitor stations in Settings to see playlist overlap analysis")
                .font(.sora(14))
                .foregroundStyle(Color.rbTextSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    NavigationStack {
        PlaylistOverlapView()
    }
    .preferredColorScheme(.dark)
}
