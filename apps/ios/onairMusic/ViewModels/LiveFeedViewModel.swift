import Foundation
import SwiftUI

/// Manages the SSE live-feed connection lifecycle for the Detections tab.
/// The dedicated Live screen was removed; incoming events are forwarded via
/// `onEvent` so DetectionsViewModel can prepend them (or count them for the
/// "N new detections" pill). Also drives the Live/Offline toolbar indicator.
@MainActor
@Observable
final class LiveFeedViewModel {
    var connectionState: ConnectionState = .disconnected

    /// Called on the main actor for every live detection received over SSE.
    var onEvent: ((AirplayEvent) -> Void)?

    private let sseClient = SSEClient()
    private var disconnectTask: Task<Void, Never>?
    private var connectTask: Task<Void, Never>?
    private var retryCount = 0
    private let maxRetries = 5

    enum ConnectionState: Sendable {
        case connecting, connected, disconnected, reconnecting
    }

    // MARK: - Connect

    /// Connect to the SSE live-feed endpoint and start receiving events.
    /// Each event is forwarded to `onEvent`.
    func connect(token: String) async {
        connectionState = .connecting
        connectTask?.cancel()

        let baseURL = await APIClient.shared.getBaseURL()
        // Strip /v1 suffix to get the API root (SSEClient appends v1/live-feed)
        let apiRoot: URL
        if baseURL.lastPathComponent == "v1" {
            apiRoot = baseURL.deletingLastPathComponent()
        } else {
            apiRoot = baseURL
        }

        let stream = await sseClient.connect(baseURL: apiRoot, token: token)

        connectionState = .connected
        retryCount = 0

        let task = Task {
            for await event in stream {
                if Task.isCancelled { break }
                onEvent?(event)
            }

            // Stream ended
            if !Task.isCancelled {
                connectionState = .disconnected
                // Auto-retry with exponential backoff if the connection dropped
                if retryCount < maxRetries {
                    retryCount += 1
                    let delay = min(pow(2.0, Double(retryCount)), 30.0)
                    try? await Task.sleep(for: .seconds(delay))
                    if !Task.isCancelled {
                        await connect(token: token)
                    }
                }
            }
        }
        connectTask = task
    }

    // MARK: - Reconnect

    /// Reconnect to the SSE endpoint. SSEClient automatically sends Last-Event-ID for backfill.
    func reconnect(token: String) async {
        retryCount = 0
        connectionState = .reconnecting
        await connect(token: token)
    }

    // MARK: - Background Disconnect Scheduling

    /// Schedule a disconnect after the given number of seconds.
    /// Used when the app enters background (~30 seconds).
    func scheduleDisconnect(after seconds: Int) {
        disconnectTask?.cancel()
        disconnectTask = Task {
            try? await Task.sleep(for: .seconds(seconds))
            guard !Task.isCancelled else { return }
            connectTask?.cancel()
            await sseClient.disconnect()
            connectionState = .disconnected
        }
    }

    /// Cancel a pending scheduled disconnect (e.g., when app returns to foreground quickly).
    func cancelScheduledDisconnect() {
        disconnectTask?.cancel()
        disconnectTask = nil
    }

    // MARK: - Disconnect

    /// Immediately disconnect from the SSE stream.
    func disconnect() {
        connectTask?.cancel()
        connectTask = nil
        Task { await sseClient.disconnect() }
        connectionState = .disconnected
    }
}
