import SwiftUI

/// Station browser for adding competitor stations.
/// Shows all stations with search filtering.
/// Already-watched stations show a checkmark and are non-tappable.
struct CompetitorStationPickerView: View {
    let viewModel: CompetitorListViewModel

    @Environment(\.dismiss) private var dismiss

    @State private var stations: [Station] = []
    @State private var ownStationIds: [Int] = []
    @State private var searchText = ""
    @State private var isLoadingStations = true
    @State private var addingStationId: Int?
    @State private var errorMessage: String?
    @State private var showErrorAlert = false

    /// Stations available to add: all stations minus the user's own station(s),
    /// filtered by search text. (You can't watch your own station as a competitor.)
    private var filteredStations: [Station] {
        let available = stations.filter { !ownStationIds.contains($0.id) }
        if searchText.isEmpty {
            return available
        }
        return available.filter {
            $0.name.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        Group {
            if isLoadingStations {
                LoadingView(message: "Loading stations...")
            } else {
                List(filteredStations) { station in
                    stationRow(station)
                        .listRowBackground(Color.clear)
                        .listRowSeparatorTint(Color.rbHairline)
                }
                .scrollContentBackground(.hidden)
                .searchable(text: $searchText, prompt: "Search stations")
            }
        }
        .onairGlow(subtle: true)
        .navigationTitle("Add Competitor")
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(Color.rbBackground, for: .navigationBar)
        .preferredColorScheme(.dark)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") {
                    dismiss()
                }
            }
        }
        .alert("Error", isPresented: $showErrorAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
        .task {
            await loadStations()
            await loadOwnStations()
            await viewModel.loadWatchedStations()
            isLoadingStations = false
        }
    }

    // MARK: - Station Row

    @ViewBuilder
    private func stationRow(_ station: Station) -> some View {
        let isWatched = viewModel.watchedStations.contains { $0.stationId == station.id }
        let isAdding = addingStationId == station.id

        HStack {
            Text(station.name)
                .font(.sora(15, .medium))
                .foregroundStyle(Color.rbTextPrimary)

            Spacer()

            if isAdding {
                ProgressView()
                    .tint(Color.rbAccent)
            } else if isWatched {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(Color.rbSuccess)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            guard !isWatched && addingStationId == nil else { return }
            Task {
                await addCompetitor(stationId: station.id)
            }
        }
        .opacity(isWatched ? 0.6 : 1.0)
    }

    // MARK: - Actions

    private func loadStations() async {
        do {
            let stationList: [Station] = try await APIClient.shared.request(.stations)
            stations = stationList
        } catch {
            errorMessage = error.localizedDescription
            showErrorAlert = true
        }
    }

    private func loadOwnStations() async {
        // Best-effort: exclude the user's own station(s) from the picker. Non-fatal.
        if let own: OwnStationsResponse = try? await APIClient.shared.request(.ownStations) {
            ownStationIds = own.stationIds
        }
    }

    private func addCompetitor(stationId: Int) async {
        addingStationId = stationId

        do {
            try await viewModel.addStation(stationId: stationId)
        } catch let error as APIError {
            switch error {
            case .httpError(let code, _):
                if code == 409 {
                    errorMessage = "This station is already in your competitor list."
                } else {
                    // Show the backend's actual reason (e.g. "Cannot watch your own
                    // station" or "Maximum 20 competitor stations allowed").
                    errorMessage = error.localizedDescription
                }
            default:
                errorMessage = error.localizedDescription
            }
            showErrorAlert = true
        } catch {
            errorMessage = error.localizedDescription
            showErrorAlert = true
        }

        addingStationId = nil
    }
}

#Preview {
    NavigationStack {
        CompetitorStationPickerView(viewModel: CompetitorListViewModel())
    }
}
