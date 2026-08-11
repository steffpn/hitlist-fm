import SwiftUI

/// Main detections tab.
/// Shows paginated airplay events with search bar, filter chips, infinite scroll,
/// live SSE inserts (prepend at top / "N new detections" pill when scrolled down),
/// and SSE connection status indicator.
struct DetectionsView: View {
    @State private var viewModel = DetectionsViewModel()
    @State private var exportViewModel = ExportViewModel()
    @State private var liveFeedViewModel = LiveFeedViewModel()
    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(\.scenePhase) private var scenePhase

    /// Scroll-to-top request consumed by the ScrollViewReader in detectionsList.
    @State private var scrollToTopRequest = false

    /// Anchor id for the sentinel view at the very top of the list.
    private static let topAnchorId = "detections-top"

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Live indicator + export, inline with the content (kept out of the
                // toolbar so they don't get wrapped in the system glass capsule)
                // and horizontally aligned with the filter chips / detection rows.
                HStack(spacing: 12) {
                    Spacer()
                    connectionIndicator
                    exportMenu
                }
                .padding(.horizontal)
                .padding(.top, 2)

                // Filter chips below search bar
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
                    if viewModel.isLoading && viewModel.detections.isEmpty {
                        LoadingView(message: "Loading detections...")
                    } else if let error = viewModel.error, viewModel.detections.isEmpty {
                        ErrorView(message: error) {
                            Task {
                                await viewModel.loadInitial()
                            }
                        }
                    } else if viewModel.detections.isEmpty && !viewModel.isLoading {
                        emptyState
                    } else {
                        detectionsList
                    }
                }
            }
            .onairGlow(subtle: true)
            .navigationTitle("Detections")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbarBackground(Color.rbBackground, for: .navigationBar)
            .overlay {
                if exportViewModel.isExporting {
                    ZStack {
                        Color.black.opacity(0.5)
                            .ignoresSafeArea()

                        VStack(spacing: 12) {
                            ProgressView()
                                .controlSize(.large)
                                .tint(Color.rbAccent)
                            Text("Exporting...")
                                .font(.subheadline)
                                .foregroundStyle(Color.rbTextSecondary)
                        }
                        .padding(24)
                        .background(Color.rbSurface, in: RoundedRectangle(cornerRadius: 12))
                    }
                }
            }
            .alert(
                "Export Error",
                isPresented: Binding(
                    get: { exportViewModel.error != nil },
                    set: { if !$0 { exportViewModel.error = nil } }
                )
            ) {
                Button("OK", role: .cancel) {}
            } message: {
                if let error = exportViewModel.error {
                    Text(error)
                }
            }
            .sheet(isPresented: $exportViewModel.showShareSheet) {
                if let url = exportViewModel.exportedFileURL {
                    ShareSheet(url: url)
                }
            }
            .searchable(
                text: $viewModel.searchQuery,
                prompt: "Search songs, artists, ISRC..."
            )
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                await viewModel.loadStations()
                await viewModel.loadInitial()
            }
            .task(id: viewModel.searchQuery) {
                // Debounce search: wait 300ms, then reload.
                // SwiftUI .task(id:) auto-cancels previous tasks when searchQuery changes.
                do {
                    try await Task.sleep(for: .milliseconds(300))
                    await viewModel.loadInitial()
                } catch {
                    // Task cancelled -- a new search query was typed
                }
            }
            .task {
                // Forward live SSE events into the list (prepend or pill).
                liveFeedViewModel.onEvent = { [weak viewModel] event in
                    viewModel?.handleLiveEvent(event)
                }
                await connectToSSE()
            }
            .onChange(of: scenePhase) { _, newPhase in
                handleScenePhaseChange(newPhase)
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Header Controls

    /// CSV/PDF export menu shown inline in the content header.
    private var exportMenu: some View {
        Menu {
            Button {
                Task {
                    await exportViewModel.exportCSV(
                        query: viewModel.searchQuery.isEmpty ? nil : viewModel.searchQuery,
                        startDate: viewModel.startDate,
                        endDate: viewModel.endDate,
                        stationId: viewModel.selectedStationId
                    )
                }
            } label: {
                Label("Export CSV", systemImage: "tablecells")
            }

            Button {
                Task {
                    await exportViewModel.exportPDF(
                        query: viewModel.searchQuery.isEmpty ? nil : viewModel.searchQuery,
                        startDate: viewModel.startDate,
                        endDate: viewModel.endDate,
                        stationId: viewModel.selectedStationId
                    )
                }
            } label: {
                Label("Export PDF", systemImage: "doc.richtext")
            }
        } label: {
            Image(systemName: "square.and.arrow.up")
                .foregroundStyle(Color.rbAccent)
        }
        .disabled(exportViewModel.isExporting)
    }

    // MARK: - SSE Connection Indicator

    /// Colored pill indicating SSE connection state.
    private var connectionIndicator: some View {
        HStack(spacing: 5) {
            Circle()
                .fill(connectionColor)
                .frame(width: 7, height: 7)
            Text(connectionLabel)
                .font(.sora(11, .semibold))
                .foregroundStyle(connectionColor)
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(Capsule().fill(connectionColor.opacity(0.16)))
        .overlay(Capsule().strokeBorder(connectionColor.opacity(0.35), lineWidth: 1))
    }

    private var connectionColor: Color {
        switch liveFeedViewModel.connectionState {
        case .connected:
            return .rbLive
        case .disconnected:
            return .rbTextTertiary
        case .connecting, .reconnecting:
            return .rbWarning
        }
    }

    private var connectionLabel: String {
        switch liveFeedViewModel.connectionState {
        case .connected:
            return "Live"
        case .disconnected:
            return "Offline"
        case .connecting:
            return "Connecting..."
        case .reconnecting:
            return "Reconnecting..."
        }
    }

    // MARK: - SSE Lifecycle

    private func connectToSSE() async {
        guard let token = KeychainHelper.read(key: "accessToken") else { return }
        await liveFeedViewModel.connect(token: token)
    }

    private func handleScenePhaseChange(_ phase: ScenePhase) {
        switch phase {
        case .background:
            liveFeedViewModel.scheduleDisconnect(after: 30)
        case .active:
            liveFeedViewModel.cancelScheduledDisconnect()
            if liveFeedViewModel.connectionState == .disconnected {
                guard let token = KeychainHelper.read(key: "accessToken") else { return }
                Task { await liveFeedViewModel.reconnect(token: token) }
            }
        default:
            break
        }
    }

    // MARK: - Detections List

    private var detectionsList: some View {
        ZStack(alignment: .top) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 0) {
                        // Sentinel tracking whether the user is at the top of the list.
                        // Visible -> live events prepend in place; hidden -> pill counts.
                        Color.clear
                            .frame(height: 1)
                            .id(Self.topAnchorId)
                            .onAppear {
                                viewModel.isAtTop = true
                                viewModel.resetLiveCounter()
                            }
                            .onDisappear {
                                viewModel.isAtTop = false
                            }

                        let groups = viewModel.groupedDetections
                        ForEach(Array(groups.enumerated()), id: \.element.id) { index, group in
                            DetectionGroupRowView(group: group)

                            Divider()
                                .overlay(Color.rbHairline)
                                .padding(.leading, 68)

                            // Trigger load more when approaching the last 5 rows
                            if index >= groups.count - 5 {
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
                                .tint(Color.rbAccent)
                                .padding()
                        }
                    }
                    .animation(.easeInOut, value: audioPlayer.currentlyPlayingId)
                }
                .scrollContentBackground(.hidden)
                .onChange(of: scrollToTopRequest) { _, requested in
                    guard requested else { return }
                    withAnimation(.easeInOut(duration: 0.3)) {
                        proxy.scrollTo(Self.topAnchorId, anchor: .top)
                    }
                    scrollToTopRequest = false
                }
            }

            // "N new detections" pill while scrolled down
            if viewModel.newLiveEventCount > 0 {
                NewDetectionsPill(count: viewModel.newLiveEventCount) {
                    viewModel.resetLiveCounter()
                    scrollToTopRequest = true
                }
                .padding(.top, 8)
                .transition(.move(edge: .top).combined(with: .opacity))
                .zIndex(1)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: viewModel.newLiveEventCount > 0)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "music.note.list")
                .font(.system(size: 40))
                .foregroundStyle(Color.rbTextTertiary)

            Text("No detections found")
                .font(.sora(17, .semibold))
                .foregroundStyle(Color.rbTextSecondary)

            if !viewModel.searchQuery.isEmpty {
                Text("Try a different search term")
                    .font(.sora(14))
                    .foregroundStyle(Color.rbTextTertiary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Share Sheet

/// UIActivityViewController wrapper for presenting downloaded export files.
/// ShareLink requires compile-time item; since we download async, UIActivityViewController is needed.
private struct ShareSheet: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [url], applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    DetectionsView()
        .environment(AudioPlayerManager())
}
