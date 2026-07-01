import Foundation
import Observation
import UIKit

/// ViewModel managing the Artists tab (admin): loads server-aggregated artist
/// summaries from GET /artists/summary, fetches artist photos from Deezer, and
/// supports search filtering. Per-artist events for the detail view are fetched
/// on demand via the airplay-events search.
@Observable
@MainActor
final class ArtistsViewModel {

    // MARK: - Data

    var artists: [ArtistSummary] = []

    /// Events per artist, fetched lazily for the detail view.
    var eventsByArtist: [String: [AirplayEvent]] = [:]

    // MARK: - Loading State

    var isLoading = false
    var error: String?

    /// Artists whose detail events are currently loading.
    private var loadingEventsFor: Set<String> = []

    // MARK: - Search

    var searchQuery = ""

    var filteredArtists: [ArtistSummary] {
        if searchQuery.isEmpty {
            return artists
        }
        return artists.filter { $0.name.localizedCaseInsensitiveContains(searchQuery) }
    }

    // MARK: - Artist Images

    var artistImages: [String: UIImage] = [:]

    // MARK: - Public Methods

    /// Load the server-side artist aggregation (accurate totals, not capped
    /// at a few hundred events like the old client-side roll-up).
    func loadArtists(period: String = "week") async {
        isLoading = true
        error = nil

        do {
            artists = try await APIClient.shared.request(
                .artistsSummary(period: period, limit: 100)
            )
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    /// Pull-to-refresh handler.
    func refresh() async {
        await loadArtists()
    }

    /// Fetch recent events for one artist (detail view), using the airplay-events
    /// search. Cached per artist for the lifetime of the view model.
    func loadEvents(for artistName: String) async {
        guard eventsByArtist[artistName] == nil,
              !loadingEventsFor.contains(artistName) else { return }
        loadingEventsFor.insert(artistName)
        defer { loadingEventsFor.remove(artistName) }

        do {
            let response: PaginatedResponse<AirplayEvent> = try await APIClient.shared.request(
                .airplayEvents(
                    cursor: nil,
                    limit: 50,
                    query: artistName,
                    startDate: nil,
                    endDate: nil,
                    stationId: nil
                )
            )
            // The q filter also matches title/ISRC; keep only this artist's rows.
            eventsByArtist[artistName] = response.data.filter {
                $0.artistName.localizedCaseInsensitiveCompare(artistName) == .orderedSame
            }
        } catch {
            // Detail list stays empty; summary stats still shown.
        }
    }

    /// Fetch artist photo from Deezer API.
    func loadArtistImage(for artistName: String) async {
        // Skip if already cached
        guard artistImages[artistName] == nil else { return }

        let query = artistName
            .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let urlString = "https://api.deezer.com/search/artist?q=\(query)&limit=1"

        guard let url = URL(string: urlString) else { return }

        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let result = try JSONDecoder().decode(DeezerArtistSearchResult.self, from: data)

            if let pictureUrl = result.data?.first?.pictureXl,
               let imageUrl = URL(string: pictureUrl) {
                let (imageData, _) = try await URLSession.shared.data(from: imageUrl)
                if let image = UIImage(data: imageData) {
                    artistImages[artistName] = image
                }
            }
        } catch {
            // Silent fail - placeholder stays
        }
    }

    /// Get loaded events for a specific artist (empty until loadEvents completes).
    func events(for artistName: String) -> [AirplayEvent] {
        return eventsByArtist[artistName] ?? []
    }
}

// MARK: - Deezer Artist Search Models

private struct DeezerArtistSearchResult: Codable {
    let data: [DeezerArtist]?
}

private struct DeezerArtist: Codable {
    let name: String?
    let pictureXl: String?

    enum CodingKeys: String, CodingKey {
        case name
        case pictureXl = "picture_xl"
    }
}
