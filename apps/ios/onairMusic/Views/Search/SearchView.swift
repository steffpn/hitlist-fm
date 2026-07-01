import SwiftUI

/// Dedicated search tab for finding detections by song, artist, or ISRC.
/// Same infinite scroll pattern as DetectionsView but with search-first UX.
struct SearchView: View {
    @State private var viewModel = DetectionsViewModel()
    @Environment(AudioPlayerManager.self) private var audioPlayer

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter chips
                FilterChipsView(
                    startDate: $viewModel.startDate,
                    endDate: $viewModel.endDate,
                    selectedStationId: $viewModel.selectedStationId,
                    stations: viewModel.stations,
                    onFilterChange: {
                        await viewModel.loadInitial()
                    }
                )

                // Main content
                Group {
                    if viewModel.searchQuery.isEmpty && viewModel.detections.isEmpty && !viewModel.isLoading {
                        searchPrompt
                    } else if viewModel.isLoading && viewModel.detections.isEmpty {
                        LoadingView(message: "Searching...")
                    } else if let error = viewModel.error, viewModel.detections.isEmpty {
                        ErrorView(message: error) {
                            Task {
                                await viewModel.loadInitial()
                            }
                        }
                    } else if viewModel.detections.isEmpty && !viewModel.isLoading {
                        noResults
                    } else {
                        resultsList
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .onairGlow(subtle: true)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .navigationTitle("Search")
            .searchable(
                text: $viewModel.searchQuery,
                prompt: "Search songs, artists, ISRC..."
            )
            .task {
                await viewModel.loadStations()
            }
            .task(id: viewModel.searchQuery) {
                // Debounce search: wait 300ms, then load.
                guard !viewModel.searchQuery.isEmpty else { return }
                do {
                    try await Task.sleep(for: .milliseconds(300))
                    await viewModel.loadInitial()
                } catch {
                    // Task cancelled -- user typed more
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Search Prompt (empty state before any search)

    private var searchPrompt: some View {
        VStack(spacing: 16) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 40))
                .foregroundStyle(Color.rbTextTertiary)

            Text("Search Detections")
                .font(.sora(17, .semibold))
                .foregroundStyle(Color.rbTextSecondary)

            Text("Find airplay events by song title, artist name, or ISRC code")
                .font(.sora(14))
                .foregroundStyle(Color.rbTextTertiary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - No Results

    private var noResults: some View {
        VStack(spacing: 16) {
            Image(systemName: "music.note.list")
                .font(.system(size: 40))
                .foregroundStyle(Color.rbTextTertiary)

            Text("No results found")
                .font(.sora(17, .semibold))
                .foregroundStyle(Color.rbTextSecondary)

            Text("Try a different search term or adjust filters")
                .font(.sora(14))
                .foregroundStyle(Color.rbTextTertiary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Results List

    private var resultsList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(Array(viewModel.detections.enumerated()), id: \.element.id) { index, event in
                    DetectionRowView(event: event)

                    Divider()
                        .overlay(Color.rbHairline)
                        .padding(.leading)

                    // Trigger load more when approaching the last 5 items
                    if index >= viewModel.detections.count - 5 {
                        Color.clear
                            .frame(height: 0)
                            .onAppear {
                                Task {
                                    await viewModel.loadMore()
                                }
                            }
                    }
                }

                // Loading more indicator
                if viewModel.isLoadingMore {
                    ProgressView()
                        .padding()
                }
            }
            .animation(.easeInOut, value: audioPlayer.currentlyPlayingId)
        }
    }
}

#Preview {
    SearchView()
        .environment(AudioPlayerManager())
}
