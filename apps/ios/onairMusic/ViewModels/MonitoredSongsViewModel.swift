import Foundation

/// Manages the artist's monitored songs list: loading, adding new songs.
/// Uses @Observable for modern SwiftUI data flow (iOS 17+).
@MainActor
@Observable
final class MonitoredSongsViewModel {
    // MARK: - Published State

    /// List of songs the artist is monitoring.
    var songs: [MonitoredSong] = []

    /// Whether a data fetch is in progress.
    var isLoading = false

    /// Error message to display. Nil when no error.
    var error: String?

    // MARK: - Data Loading

    /// Fetch the list of monitored songs.
    func loadSongs() async {
        isLoading = true
        error = nil
        do {
            songs = try await APIClient.shared.request(.artistSongs)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    // MARK: - Mutations

    /// Add a new song to the monitored list. Returns true on success.
    func addSong(title: String, artist: String, isrc: String) async -> Bool {
        do {
            let _: MonitoredSong = try await APIClient.shared.request(
                .addArtistSong(songTitle: title, artistName: artist, isrc: isrc)
            )
            await loadSongs()
            return true
        } catch {
            self.error = error.localizedDescription
            return false
        }
    }

    /// Remove a monitored song (DELETE /artist/songs/:id — 204 on success, 404 if
    /// it isn't the caller's song). Returns true on success.
    @discardableResult
    func deleteSong(id: Int) async -> Bool {
        do {
            let (_, response) = try await APIClient.shared.requestRaw(.deleteArtistSong(id: id))
            if (200...299).contains(response.statusCode) {
                songs.removeAll { $0.id == id }
                return true
            }
            error = response.statusCode == 404
                ? "Song not found — it may have been removed already."
                : "Failed to remove song (HTTP \(response.statusCode))."
            return false
        } catch {
            self.error = error.localizedDescription
            return false
        }
    }
}
