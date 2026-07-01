import SwiftUI

/// Competitor station list showing cards with station name, play count, and top song.
/// Station-role users access this from Settings > Competitor Stations.
struct CompetitorListView: View {
    @State private var viewModel = CompetitorListViewModel()
    @State private var showingStationPicker = false

    var body: some View {
        ZStack {
            if viewModel.isLoading && viewModel.cards.isEmpty {
                LoadingView()
            } else if let errorMessage = viewModel.error, viewModel.cards.isEmpty {
                ErrorView(message: errorMessage) {
                    Task { await viewModel.loadSummary() }
                }
            } else if viewModel.cards.isEmpty {
                // Empty state
                emptyStateView
            } else {
                // Content
                ScrollView {
                    VStack(spacing: 16) {
                        // Period picker
                        Picker("Period", selection: $viewModel.selectedPeriod) {
                            Text("Today").tag("day")
                            Text("This Week").tag("week")
                            Text("This Month").tag("month")
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal)
                        .colorMultiply(.rbAccent)

                        // Competitor cards
                        LazyVStack(spacing: 12) {
                            ForEach(viewModel.cards) { card in
                                NavigationLink {
                                    CompetitorDetailView(
                                        stationId: card.stationId,
                                        stationName: card.stationName
                                    )
                                } label: {
                                    CompetitorCardView(card: card)
                                }
                                .buttonStyle(.plain)
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        Task {
                                            await viewModel.removeStation(stationId: card.stationId)
                                        }
                                    } label: {
                                        Label("Remove", systemImage: "trash")
                                    }
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    .padding(.vertical)
                }
                .refreshable {
                    await viewModel.loadSummary()
                }
            }
        }
        .onairGlow(subtle: true)
        .navigationTitle("Competitors")
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(Color.rbBackground, for: .navigationBar)
        .preferredColorScheme(.dark)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingStationPicker = true
                } label: {
                    Image(systemName: "plus")
                        .foregroundStyle(Color.rbAccent)
                }
            }
        }
        .sheet(isPresented: $showingStationPicker) {
            NavigationStack {
                CompetitorStationPickerView(viewModel: viewModel)
            }
        }
        .task(id: viewModel.selectedPeriod) {
            await viewModel.loadSummary()
        }
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "binoculars")
                .font(.system(size: 48))
                .foregroundStyle(Color.rbTextTertiary)

            Text("No Competitor Stations")
                .font(.sora(20, .semibold))
                .foregroundStyle(Color.rbTextPrimary)

            Text("Tap + to start monitoring competitor stations")
                .font(.sora(14))
                .foregroundStyle(Color.rbTextSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Competitor Card

/// A card displaying a competitor station's summary data.
private struct CompetitorCardView: View {
    let card: CompetitorCard

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(card.stationName)
                    .font(.sora(16, .bold))
                    .foregroundStyle(Color.rbTextPrimary)

                Spacer()

                Text("\(card.playCount)")
                    .font(.mono(14, .semibold))
                    .foregroundStyle(Color.rbAccentLight)
                + Text(" plays")
                    .font(.sora(13))
                    .foregroundStyle(Color.rbTextSecondary)
            }

            if let topSong = card.topSong {
                Text("'\(topSong.title)' by \(topSong.artist)")
                    .font(.sora(12))
                    .foregroundStyle(Color.rbTextTertiary)
                    .lineLimit(1)
            } else {
                Text("No plays")
                    .font(.sora(12))
                    .foregroundStyle(Color.rbTextTertiary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .rbCard(radius: 18)
    }
}

#Preview {
    NavigationStack {
        CompetitorListView()
    }
}
