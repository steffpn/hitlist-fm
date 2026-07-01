import AVFoundation
import Foundation
import MediaPlayer
import UIKit

/// Metadata about the snippet being played, shown in the in-app NowPlayingBar
/// and mirrored to the lock screen via MPNowPlayingInfoCenter.
struct SnippetMetadata: Sendable, Equatable {
    let title: String
    let artist: String
    let stationName: String?
    let artworkUrl: String?
}

/// Manages single-active audio snippet playback via AVPlayer.
/// Only one snippet can play at a time across the entire app.
/// Uses presigned URLs fetched from the backend for each snippet.
/// Publishes lock-screen metadata (MPNowPlayingInfoCenter) and handles
/// play/pause remote commands (MPRemoteCommandCenter).
@Observable
@MainActor
final class AudioPlayerManager {
    // MARK: - Public State

    /// ID of the event currently being played (or loading).
    var currentlyPlayingId: Int?

    /// Metadata for the active snippet (title/station for NowPlayingBar + lock screen).
    var currentMetadata: SnippetMetadata?

    /// Playback progress from 0.0 to 1.0.
    var playbackProgress: Double = 0

    /// Whether audio is currently playing.
    var isPlaying: Bool = false

    /// Whether a snippet URL is being fetched from the API.
    var isLoadingSnippet: Bool = false

    /// Error message from the last play attempt.
    var error: String?

    /// Current playback time in seconds.
    var currentTime: Double = 0

    /// Total duration of the snippet in seconds.
    var duration: Double = 0

    // MARK: - Private State

    private var player: AVPlayer?
    private var timeObserver: Any?
    private var endObserver: NSObjectProtocol?
    private var remoteCommandsConfigured = false
    private var artworkTask: Task<Void, Never>?

    // MARK: - Public Methods

    /// Play, pause, or resume snippet for the given event.
    /// - If currently playing this event: pause.
    /// - If paused on this event: resume.
    /// - Otherwise: stop current, fetch presigned URL, and play new snippet.
    /// - Parameter metadata: song/station info for the NowPlayingBar and lock screen.
    func play(eventId: Int, metadata: SnippetMetadata? = nil) async {
        // Toggle pause/resume if same event
        if currentlyPlayingId == eventId {
            if isPlaying {
                pause()
                return
            } else if player != nil {
                resume()
                return
            }
        }

        // Stop any current playback
        stop()

        // Start loading new snippet
        currentlyPlayingId = eventId
        currentMetadata = metadata
        isLoadingSnippet = true
        error = nil

        do {
            print("[AudioPlayer] Fetching snippet for eventId=\(eventId), snippetUrl check passed")
            // Fetch fresh presigned URL from backend
            let response: SnippetUrlResponse = try await APIClient.shared.request(
                .snippetUrl(eventId: eventId)
            )

            isLoadingSnippet = false

            guard let audioUrl = URL(string: response.url) else {
                error = "Invalid audio URL"
                stop()
                return
            }

            // Verify we are still supposed to play this event (user may have tapped another)
            guard currentlyPlayingId == eventId else { return }

            // Configure audio session for playback
            try AVAudioSession.sharedInstance().setCategory(.playback)
            try AVAudioSession.sharedInstance().setActive(true)

            // Create player
            let playerItem = AVPlayerItem(url: audioUrl)
            let newPlayer = AVPlayer(playerItem: playerItem)
            player = newPlayer

            // Add periodic time observer (every 0.1s)
            let interval = CMTime(seconds: 0.1, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
            timeObserver = newPlayer.addPeriodicTimeObserver(
                forInterval: interval,
                queue: .main
            ) { [weak self] time in
                Task { @MainActor in
                    guard let self else { return }
                    let current = CMTimeGetSeconds(time)
                    let total = CMTimeGetSeconds(newPlayer.currentItem?.duration ?? .zero)
                    if total.isFinite && total > 0 {
                        let durationWasUnknown = self.duration <= 0
                        self.currentTime = current
                        self.duration = total
                        self.playbackProgress = current / total
                        if durationWasUnknown {
                            // Duration became known -- push it to the lock screen.
                            self.updateNowPlayingPlaybackState()
                        }
                    }
                }
            }

            // Observe playback end
            endObserver = NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: playerItem,
                queue: .main
            ) { [weak self] _ in
                Task { @MainActor in
                    self?.stop()
                }
            }

            // Start playback
            newPlayer.play()
            isPlaying = true

            // Lock screen: metadata + remote play/pause
            configureRemoteCommandsIfNeeded()
            updateNowPlayingInfo()
            loadLockScreenArtwork()

        } catch is CancellationError {
            // View disappeared during URL fetch -- silently stop
            stop()
        } catch {
            isLoadingSnippet = false
            self.error = error.localizedDescription
            print("[AudioPlayer] ERROR playing eventId=\(eventId): \(error)")
            stop()
        }
    }

    /// Pause current playback.
    func pause() {
        player?.pause()
        isPlaying = false
        updateNowPlayingPlaybackState()
    }

    /// Resume paused playback.
    func resume() {
        player?.play()
        isPlaying = true
        updateNowPlayingPlaybackState()
    }

    /// Seek to a specific progress point (0.0 to 1.0).
    func seek(to progress: Double) {
        guard let player, duration > 0 else { return }
        let targetTime = CMTime(seconds: duration * progress, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        player.seek(to: targetTime, toleranceBefore: .zero, toleranceAfter: .zero)
        updateNowPlayingPlaybackState()
    }

    /// Stop playback and reset all state.
    func stop() {
        // Remove time observer
        if let timeObserver, let player {
            player.removeTimeObserver(timeObserver)
        }
        timeObserver = nil

        // Remove end-of-playback observer
        if let endObserver {
            NotificationCenter.default.removeObserver(endObserver)
        }
        endObserver = nil

        // Cancel any in-flight artwork fetch
        artworkTask?.cancel()
        artworkTask = nil

        // Stop and release player
        player?.pause()
        player = nil

        // Reset state
        currentlyPlayingId = nil
        currentMetadata = nil
        isPlaying = false
        playbackProgress = 0
        currentTime = 0
        duration = 0
        isLoadingSnippet = false

        // Clear the lock screen entry
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }

    // MARK: - Lock Screen (MPNowPlayingInfoCenter / MPRemoteCommandCenter)

    /// Hook up lock-screen play/pause commands once per app lifetime.
    private func configureRemoteCommandsIfNeeded() {
        guard !remoteCommandsConfigured else { return }
        remoteCommandsConfigured = true

        let center = MPRemoteCommandCenter.shared()

        center.playCommand.addTarget { [weak self] _ in
            guard let self, self.player != nil else { return .commandFailed }
            self.resume()
            return .success
        }

        center.pauseCommand.addTarget { [weak self] _ in
            guard let self, self.player != nil else { return .commandFailed }
            self.pause()
            return .success
        }

        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            guard let self, self.player != nil else { return .commandFailed }
            if self.isPlaying { self.pause() } else { self.resume() }
            return .success
        }
    }

    /// Publish title/station metadata for the lock screen and Control Center.
    private func updateNowPlayingInfo() {
        var info: [String: Any] = [:]

        info[MPMediaItemPropertyTitle] = currentMetadata?.title ?? "Broadcast Proof"
        if let artist = currentMetadata?.artist {
            info[MPMediaItemPropertyArtist] = artist
        }
        if let station = currentMetadata?.stationName {
            info[MPMediaItemPropertyAlbumTitle] = station
        }
        if duration > 0 {
            info[MPMediaItemPropertyPlaybackDuration] = duration
        }
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime
        info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0

        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    /// Refresh elapsed time / rate after pause, resume, or seek so the lock
    /// screen scrubber stays in sync.
    private func updateNowPlayingPlaybackState() {
        guard var info = MPNowPlayingInfoCenter.default().nowPlayingInfo else { return }
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime
        info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0
        if duration > 0 {
            info[MPMediaItemPropertyPlaybackDuration] = duration
        }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    /// Fetch the album artwork (if any) and attach it to the lock-screen entry.
    private func loadLockScreenArtwork() {
        artworkTask?.cancel()
        guard let urlString = currentMetadata?.artworkUrl,
              let url = URL(string: urlString) else { return }

        let eventId = currentlyPlayingId
        artworkTask = Task { [weak self] in
            guard let data = try? await URLSession.shared.data(from: url).0,
                  let image = UIImage(data: data),
                  !Task.isCancelled else { return }

            guard let self, self.currentlyPlayingId == eventId else { return }

            let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
            var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
            info[MPMediaItemPropertyArtwork] = artwork
            MPNowPlayingInfoCenter.default().nowPlayingInfo = info
        }
    }
}
