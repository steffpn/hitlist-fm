import Foundation
import Observation
import SwiftUI

/// ViewModel managing detections list state: search, filters, cursor-based pagination,
/// plus live SSE inserts (prepend when scrolled to top, "N new detections" pill otherwise).
/// Uses @Observable macro (iOS 17+) per project convention.
@Observable
@MainActor
final class DetectionsViewModel {

    // MARK: - Data

    var detections: [AirplayEvent] = []
    var stations: [Station] = []

    /// Repeated plays of the same song, on the same station, on the same local day,
    /// collapsed into one row. Radio rotation puts a single track on air a dozen
    /// times a day, which buried everything else in the feed.
    ///
    /// Grouping stays *within* the station on purpose: the same song on Kiss FM and
    /// on Virgin are two different facts, and every row names its station.
    /// It is also computed over the currently loaded pages only — a group therefore
    /// grows as the user scrolls, which is the honest behaviour for a cursor-paginated
    /// feed (the alternative would be a count that silently contradicts the list).
    var groupedDetections: [DetectionGroup] {
        var order: [String] = []
        var buckets: [String: [AirplayEvent]] = [:]
        let calendar = Calendar.current

        for event in detections {
            let day = calendar.startOfDay(for: event.startedAt)
            let song = (event.isrc?.isEmpty == false)
                ? event.isrc!
                : "\(event.artistName)|\(event.songTitle)"
            let key = "\(Int(day.timeIntervalSince1970))|\(event.stationId)|\(song)"
            if buckets[key] == nil {
                order.append(key)
                buckets[key] = []
            }
            buckets[key]?.append(event)
        }

        return order.compactMap { key in
            guard let events = buckets[key], !events.isEmpty else { return nil }
            return DetectionGroup(id: key, events: events)
        }
    }

    // MARK: - Live Feed (SSE inserts)

    /// Whether the user is currently scrolled to the top of the list.
    var isAtTop = true

    /// Live events that arrived while the user was scrolled down.
    /// Drives the "N new detections" pill.
    var newLiveEventCount = 0

    /// Live inserts only make sense on the unfiltered list; with an active
    /// search/filter a fresh event may simply not match it.
    private var canAcceptLiveEvents: Bool {
        searchQuery.isEmpty && startDate == nil && endDate == nil && selectedStationId == nil
    }

    /// Handle a live SSE event: prepend when the user is at the top of the
    /// unfiltered list, otherwise insert silently and bump the pill counter.
    func handleLiveEvent(_ event: AirplayEvent) {
        guard canAcceptLiveEvents, !isLoading else { return }
        guard !detections.contains(where: { $0.id == event.id }) else { return }

        if isAtTop {
            withAnimation(.easeInOut(duration: 0.3)) {
                detections.insert(event, at: 0)
            }
        } else {
            detections.insert(event, at: 0)
            newLiveEventCount += 1
        }
    }

    /// Reset the "new detections" counter (user scrolled back to top).
    func resetLiveCounter() {
        newLiveEventCount = 0
    }

    // MARK: - Loading State

    var isLoading = false
    var isLoadingMore = false
    var error: String?

    // MARK: - Pagination

    private(set) var nextCursor: Int?

    var hasMore: Bool {
        nextCursor != nil
    }

    // MARK: - Search & Filters

    var searchQuery = ""
    var startDate: Date?
    var endDate: Date?
    var selectedStationId: Int?

    // MARK: - Page Size

    private let pageSize = 20

    // MARK: - Public Methods

    /// Load the first page of detections. Resets cursor and replaces current data.
    /// Called on initial load, search change, and filter change.
    func loadInitial() async {
        isLoading = true
        error = nil
        nextCursor = nil
        detections = []
        newLiveEventCount = 0

        do {
            let response = try await fetchPage(cursor: nil)
            detections = response.data
            nextCursor = response.nextCursor
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    /// Load the next page of detections. Appends to existing data.
    /// Guards against concurrent loads and end-of-list.
    func loadMore() async {
        guard !isLoadingMore, hasMore else { return }

        isLoadingMore = true

        do {
            let response = try await fetchPage(cursor: nextCursor)
            detections.append(contentsOf: response.data)
            nextCursor = response.nextCursor
        } catch {
            self.error = error.localizedDescription
        }

        isLoadingMore = false
    }

    /// Pull-to-refresh handler. Same as loadInitial.
    func refresh() async {
        await loadInitial()
    }

    /// Fetch station list for filter picker. Called once on view appear.
    func loadStations() async {
        guard stations.isEmpty else { return }

        do {
            let result: [Station] = try await APIClient.shared.request(.stations)
            stations = result
        } catch {
            // Stations are optional for filtering -- log but don't block UI
            print("Failed to load stations: \(error.localizedDescription)")
        }
    }

    // MARK: - Private

    /// Fetch a single page of airplay events from the API.
    private func fetchPage(cursor: Int?) async throws -> PaginatedResponse<AirplayEvent> {
        let query = searchQuery.isEmpty ? nil : searchQuery
        let start = startDate.map { DateFormatters.isoDateString($0) }
        let end = endDate.map { DateFormatters.isoDateString($0) }

        let response: PaginatedResponse<AirplayEvent> = try await APIClient.shared.request(
            .airplayEvents(
                cursor: cursor,
                limit: pageSize,
                query: query,
                startDate: start,
                endDate: end,
                stationId: selectedStationId
            )
        )

        return response
    }
}
