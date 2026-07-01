import SwiftUI

/// Competitor station list showing cards with station name, play count, and top song.
/// Station-role users access this from Settings > Competitor Stations.
struct CompetitorListView: View {
    @State private var viewModel = CompetitorListViewModel()
    @State private var showingStationPicker = false

    /// Card pending removal confirmation.
    @State private var cardToRemove: CompetitorCard?

    var body: some View {
        VStack(spacing: 0) {
            competitorsHeader
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
                        // NOTE: swipeActions only work inside List, and these cards
                        // live in a LazyVStack — deletion is exposed via an explicit
                        // trash button plus a long-press context menu instead.
                        LazyVStack(spacing: 12) {
                            ForEach(viewModel.cards) { card in
                                HStack(spacing: 10) {
                                    NavigationLink {
                                        CompetitorDetailView(
                                            stationId: card.stationId,
                                            stationName: card.stationName
                                        )
                                    } label: {
                                        CompetitorCardView(card: card)
                                    }
                                    .buttonStyle(.plain)
                                    .contextMenu {
                                        Button(role: .destructive) {
                                            cardToRemove = card
                                        } label: {
                                            Label("Remove Station", systemImage: "trash")
                                        }
                                    }

                                    Button {
                                        cardToRemove = card
                                    } label: {
                                        Image(systemName: "trash")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(Color.rbError)
                                            .frame(width: 36, height: 36)
                                            .background(
                                                Color.rbError.opacity(0.12),
                                                in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                                            )
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel("Remove \(card.stationName)")
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
        }
        .onairGlow(subtle: true)
        .toolbar(.hidden, for: .navigationBar)
        .preferredColorScheme(.dark)
        .sheet(isPresented: $showingStationPicker) {
            NavigationStack {
                CompetitorStationPickerView(viewModel: viewModel)
            }
        }
        .alert(
            "Remove competitor?",
            isPresented: Binding(
                get: { cardToRemove != nil },
                set: { if !$0 { cardToRemove = nil } }
            ),
            presenting: cardToRemove
        ) { card in
            Button("Remove", role: .destructive) {
                Task { await viewModel.removeStation(stationId: card.stationId) }
            }
            Button("Cancel", role: .cancel) {}
        } message: { card in
            Text("Stop monitoring \(card.stationName)? You can add it back anytime.")
        }
        .task(id: viewModel.selectedPeriod) {
            await viewModel.loadSummary()
        }
    }

    // MARK: - Header

    /// Custom header so the title and the "+" action sit on the SAME row
    /// (the system large-title toolbar renders the button above the title).
    private var competitorsHeader: some View {
        HStack {
            Text("Competitors")
                .font(.sora(30, .bold))
                .foregroundStyle(Color.rbTextPrimary)
            Spacer()
            Button {
                showingStationPicker = true
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 38, height: 38)
                    .background(
                        Color.rbAccent,
                        in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                    )
                    .shadow(color: Color.rbAccent.opacity(0.5), radius: 10, y: 5)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 6)
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
