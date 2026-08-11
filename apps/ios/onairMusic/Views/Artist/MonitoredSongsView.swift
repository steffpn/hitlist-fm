import SwiftUI

/// List of songs the artist is monitoring for airplay detection.
/// Each row shows song info, status, play stats, and trend.
/// Tapping navigates to the detailed SongAnalyticsView.
struct MonitoredSongsView: View {
    @State private var viewModel = MonitoredSongsViewModel()
    @State private var showingAddSheet = false

    /// Song pending delete confirmation.
    @State private var songToDelete: MonitoredSong?

    var body: some View {
        ZStack {
            if viewModel.isLoading && viewModel.songs.isEmpty {
                LoadingView()
            } else if let errorMessage = viewModel.error, viewModel.songs.isEmpty {
                ErrorView(message: errorMessage) {
                    Task { await viewModel.loadSongs() }
                }
            } else if viewModel.songs.isEmpty {
                emptyState
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        Text("\(viewModel.songs.count) song\(viewModel.songs.count == 1 ? "" : "s") monitored")
                            .font(.sora(13, .medium))
                            .foregroundStyle(Color.rbTextSecondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.bottom, 2)

                        ForEach(viewModel.songs) { song in
                            NavigationLink {
                                SongAnalyticsView(song: song)
                            } label: {
                                songRow(song)
                            }
                            .buttonStyle(SongRowButtonStyle())
                            // Rows live in a LazyVStack, so swipeActions don't apply —
                            // long-press context menu handles deletion instead.
                            .contextMenu {
                                Button(role: .destructive) {
                                    songToDelete = song
                                } label: {
                                    Label("Stop Monitoring", systemImage: "trash")
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 40)
                }
                .refreshable {
                    await viewModel.loadSongs()
                }
            }
        }
        .onairGlow(subtle: true)
        .navigationTitle("My Songs")
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(Color.rbBackground, for: .navigationBar)
        .preferredColorScheme(.dark)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingAddSheet = true
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
        }
        .sheet(isPresented: $showingAddSheet) {
            AddSongSheet(viewModel: viewModel)
        }
        .alert(
            "Stop monitoring?",
            isPresented: Binding(
                get: { songToDelete != nil },
                set: { if !$0 { songToDelete = nil } }
            ),
            presenting: songToDelete
        ) { song in
            Button("Stop Monitoring", role: .destructive) {
                Task { await viewModel.deleteSong(id: song.id) }
            }
            Button("Cancel", role: .cancel) {}
        } message: { song in
            Text("'\(song.songTitle)' will no longer be tracked for airplay. Historical detections are kept.")
        }
        .task {
            await viewModel.loadSongs()
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "music.note.list")
                .font(.system(size: 48, weight: .light))
                .foregroundStyle(Color.rbAccent)

            Text("No Monitored Songs")
                .font(.sora(20, .bold))
                .foregroundStyle(Color.rbTextPrimary)

            Text("Add songs to track their airplay across radio stations.")
                .font(.sora(14))
                .foregroundStyle(Color.rbTextSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Button {
                showingAddSheet = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus")
                        .font(.system(size: 14, weight: .bold))
                    Text("Add Song")
                }
            }
            .buttonStyle(RBAccentButtonStyle())
            .padding(.top, 8)
        }
    }

    // MARK: - Song Row

    private func songRow(_ song: MonitoredSong) -> some View {
        HStack(spacing: 12) {
            // Song thumbnail
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.rbAccent.opacity(0.15))
                .frame(width: 46, height: 46)
                .overlay {
                    Image(systemName: "music.note")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Color.rbAccentLight)
                }

            // Song info
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(song.songTitle)
                        .font(.sora(14, .semibold))
                        .foregroundStyle(Color.rbTextPrimary)
                        .lineLimit(1)

                    statusBadge(song.status)
                }

                Text(song.isrc)
                    .font(.mono(11))
                    .foregroundStyle(Color.rbTextQuaternary)
                    .lineLimit(1)

                // Stats row
                HStack(spacing: 12) {
                    if let plays = song.totalPlays {
                        HStack(spacing: 3) {
                            Image(systemName: "play.fill")
                                .font(.system(size: 8))
                                .foregroundStyle(Color.rbAccent)
                            Text("\(plays) plays")
                                .font(.sora(12, .medium))
                                .foregroundStyle(Color.rbTextSecondary)
                        }
                    }

                    if let stations = song.stationCount {
                        HStack(spacing: 3) {
                            Image(systemName: "antenna.radiowaves.left.and.right")
                                .font(.system(size: 8))
                                .foregroundStyle(Color.rbTextTertiary)
                            Text("\(stations) stations")
                                .font(.sora(12, .medium))
                                .foregroundStyle(Color.rbTextSecondary)
                        }
                    }
                }
            }

            Spacer()

            // Trend + chevron
            VStack(alignment: .trailing, spacing: 6) {
                if let trend = song.trend {
                    TrendBadge(
                        direction: trend.direction,
                        percentChange: trend.percentChange,
                        compact: true
                    )
                }

                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundStyle(Color.rbTextTertiary)
            }
        }
        .padding(12)
        .rbCard(radius: 18)
        .contentShape(Rectangle())
    }

    // MARK: - Status Badge

    private func statusBadge(_ status: String) -> some View {
        let (color, label) = statusInfo(status)
        return Text(label)
            .font(.sora(9, .bold))
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(
                Capsule()
                    .fill(color.opacity(0.16))
            )
    }

    private func statusInfo(_ status: String) -> (Color, String) {
        switch status.lowercased() {
        case "active":
            return (Color.rbSuccess, "ACTIVE")
        case "expired":
            return (Color.rbTextTertiary, "EXPIRED")
        case "pending":
            return (Color.rbWarning, "PENDING")
        default:
            return (Color.rbTextTertiary, status.uppercased())
        }
    }
}

// MARK: - Button Style

private struct SongRowButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

#Preview {
    NavigationStack {
        MonitoredSongsView()
    }
    .preferredColorScheme(.dark)
}

// MARK: - Songs Tab (role-scoped)

/// Songs tab.
///
/// Deliberately one screen for every role: the backend scopes the list — an
/// artist's own tracks, a label's roster, everything a station aired — so the tab
/// adapts instead of the app carrying three near-identical screens.
///
/// Lives in this file rather than its own because the Xcode project has no
/// file-system synchronized group; a new .swift would need a hand-edited pbxproj.
struct SongsView: View {
    @State private var viewModel = SongsListViewModel()

    var body: some View {
        VStack(spacing: 12) {
            Picker("Period", selection: $viewModel.period) {
                Text("Today").tag("day")
                Text("This Week").tag("week")
                Text("This Month").tag("month")
            }
            .pickerStyle(.segmented)
            .colorMultiply(.rbAccent)
            .padding(.horizontal, 16)

            TextField("Search songs or artists", text: $viewModel.query)
                .textFieldStyle(.plain)
                .padding(10)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color.rbSurface)
                )
                .foregroundStyle(Color.rbTextPrimary)
                .padding(.horizontal, 16)
                .autocorrectionDisabled()

            if viewModel.isLoading && viewModel.response == nil {
                LoadingView()
            } else if let error = viewModel.error, viewModel.response == nil {
                ErrorView(message: error) { Task { await viewModel.load() } }
            } else if let response = viewModel.response {
                if response.songs.isEmpty {
                    Spacer()
                    Text("No plays in this period")
                        .font(.sora(14))
                        .foregroundStyle(Color.rbTextTertiary)
                    Spacer()
                } else {
                    Text(summaryLine(response))
                        .font(.mono(11))
                        .foregroundStyle(Color.rbTextTertiary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 16)

                    List(response.songs) { song in
                        SongsRowView(song: song)
                            .listRowBackground(Color.clear)
                            .listRowSeparatorTint(Color.rbHairline)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                    .refreshable { await viewModel.load() }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.rbBackground)
        .navigationTitle("Songs")
        .preferredColorScheme(.dark)
        .task { await viewModel.load() }
    }

    private func summaryLine(_ response: SongsResponse) -> String {
        let base = "\(response.totalPlays) plays · \(response.uniqueSongs) songs"
        return response.truncated ? base + " · showing top \(response.songs.count)" : base
    }
}

/// One song, expandable to its per-station split — a combined total never said
/// which station was actually carrying the track.
private struct SongsRowView: View {
    let song: SongsRow
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button {
                withAnimation(.easeInOut(duration: 0.18)) { isExpanded.toggle() }
            } label: {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(song.songTitle)
                            .font(.sora(14, .semibold))
                            .foregroundStyle(Color.rbTextPrimary)
                            .lineLimit(1)
                        Text(song.artistName)
                            .font(.sora(12))
                            .foregroundStyle(Color.rbTextSecondary)
                            .lineLimit(1)
                        Text("\(song.stationCount) station\(song.stationCount == 1 ? "" : "s")")
                            .font(.mono(10))
                            .foregroundStyle(Color.rbTextQuaternary)
                    }

                    Spacer()

                    Text("\(song.plays)")
                        .font(.mono(13))
                        .foregroundStyle(Color.rbAccent)

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color.rbTextQuaternary)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if isExpanded {
                ForEach(song.byStation) { station in
                    HStack {
                        Text(station.name)
                            .font(.sora(12))
                            .foregroundStyle(Color.rbTextSecondary)
                        Spacer()
                        Text("\(station.plays)")
                            .font(.mono(11))
                            .foregroundStyle(Color.rbTextSecondary)
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

/// Backing state for `SongsView`.
@Observable
@MainActor
final class SongsListViewModel {
    var response: SongsResponse?
    var isLoading = false
    var error: String?

    var period: String = "week" {
        didSet {
            guard period != oldValue else { return }
            Task { await load() }
        }
    }

    /// Debounced so typing does not fire a request per keystroke.
    var query: String = "" {
        didSet {
            guard query != oldValue else { return }
            searchTask?.cancel()
            searchTask = Task {
                try? await Task.sleep(for: .milliseconds(300))
                guard !Task.isCancelled else { return }
                await load()
            }
        }
    }

    private var searchTask: Task<Void, Never>?

    func load() async {
        isLoading = true
        error = nil
        do {
            let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
            response = try await APIClient.shared.request(
                .songs(period: period, query: trimmed.isEmpty ? nil : trimmed)
            )
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
