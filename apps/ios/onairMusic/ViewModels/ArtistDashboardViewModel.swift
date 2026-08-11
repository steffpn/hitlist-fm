import Foundation

/// Reorderable sections of the artist dashboard.
enum ArtistDashboardSection: String, CaseIterable, Identifiable, Sendable {
    case latestPlays
    case airplayGauge
    case mostPlayed
    case stationBreakdown
    case todayReport
    case weeklyDigest

    var id: String { rawValue }

    var title: String {
        switch self {
        case .latestPlays: return "Latest plays"
        case .airplayGauge: return "Airplay"
        case .mostPlayed: return "Most played"
        case .stationBreakdown: return "Plays per station"
        case .todayReport: return "Today's report"
        case .weeklyDigest: return "Weekly digest"
        }
    }
}

/// Manages artist dashboard state: overview metrics and weekly digest.
/// Uses @Observable for modern SwiftUI data flow (iOS 17+).
@MainActor
@Observable
final class ArtistDashboardViewModel {
    // MARK: - Published State

    /// Artist dashboard response containing overview metrics.
    var dashboard: ArtistDashboardResponse?

    /// Reporting period the totals, top song and station breakdown are scoped to.
    /// Testers asked to pick the window instead of being stuck on the week.
    var selectedPeriod: String = "week" {
        didSet {
            guard selectedPeriod != oldValue else { return }
            Task { await loadDashboard() }
        }
    }

    /// Weekly digest response with song performance summaries.
    var weeklyDigest: WeeklyDigestResponse?

    /// The few most recent airings, so opening the app answers "what just played"
    /// without a detour through the Detections tab.
    var latestPlays: [AirplayEvent] = []

    /// Dashboard section order, dragged by the user and kept on the device.
    /// Unknown ids (from an older or newer build) are dropped on read and missing
    /// ones appended, so the stored value can never blank out the dashboard.
    var sectionOrder: [ArtistDashboardSection] {
        get {
            let stored = UserDefaults.standard.stringArray(forKey: Self.sectionOrderKey) ?? []
            let known = stored.compactMap(ArtistDashboardSection.init(rawValue:))
            let missing = ArtistDashboardSection.allCases.filter { !known.contains($0) }
            return known.isEmpty ? ArtistDashboardSection.allCases : known + missing
        }
        set {
            UserDefaults.standard.set(newValue.map(\.rawValue), forKey: Self.sectionOrderKey)
        }
    }

    private static let sectionOrderKey = "artistDashboard.sectionOrder"

    /// Whether a data fetch is in progress.
    var isLoading = false

    /// Error message to display. Nil when no error.
    var error: String?

    // MARK: - Data Loading

    /// Fetch the artist dashboard overview.
    func loadDashboard() async {
        isLoading = true
        error = nil
        do {
            dashboard = try await APIClient.shared.request(.artistDashboard(period: selectedPeriod))
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    /// Fetch the most recent airings. Non-critical: the rest of the dashboard
    /// stays usable if this fails.
    func loadLatestPlays() async {
        do {
            let response: PaginatedResponse<AirplayEvent> = try await APIClient.shared.request(
                .airplayEvents(
                    cursor: nil,
                    limit: 5,
                    query: nil,
                    startDate: nil,
                    endDate: nil,
                    stationId: nil
                )
            )
            latestPlays = response.data
        } catch {
            // Non-critical -- dashboard remains functional
        }
    }

    /// Fetch the weekly digest. Non-critical, does not set error on failure.
    func loadWeeklyDigest() async {
        do {
            weeklyDigest = try await APIClient.shared.request(.artistWeeklyDigest)
        } catch {
            // Non-critical -- dashboard remains functional
        }
    }
}
