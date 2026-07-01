import SwiftUI

/// Deep-link destinations reachable from push notification taps.
/// One router state in `onairMusicApp` presents the matching screen as a sheet.
enum DeepLink: Identifiable, Equatable {
    case digest(type: String, date: String)
    case chartAlerts
    case dailyReport

    var id: String {
        switch self {
        case .digest(let type, let date):
            return "digest-\(type)-\(date)"
        case .chartAlerts:
            return "chart-alerts"
        case .dailyReport:
            return "daily-report"
        }
    }
}

@main
struct onairMusicApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var authManager = AuthManager()
    @State private var audioPlayer = AudioPlayerManager()
    @State private var notificationManager = NotificationManager()
    @State private var impersonationManager = ImpersonationManager()

    /// Single deep-link router for all push notification types.
    @State private var deepLink: DeepLink?

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authManager)
                .environment(audioPlayer)
                .environment(notificationManager)
                .environment(impersonationManager)
                .task {
                    // Configure APIClient with auth manager for 401 retry
                    await APIClient.shared.configure(authManager: authManager)
                }
                .onChange(of: authManager.isAuthenticated) { _, isAuthenticated in
                    // Ask for push permission once the user is actually signed in:
                    // fires both after checkStoredTokens() validates stored tokens
                    // and immediately after a successful login/register.
                    // When already granted, this re-registers with APNS (token refresh).
                    guard isAuthenticated else { return }
                    Task { await notificationManager.requestPermissionIfNeeded() }
                }
                .onReceive(NotificationCenter.default.publisher(for: .pushNotificationTapped)) { notification in
                    guard let type = notification.userInfo?["type"] as? String else { return }
                    switch type {
                    case "daily_digest", "weekly_digest":
                        let date = notification.userInfo?["date"] as? String ?? ""
                        deepLink = .digest(
                            type: type == "weekly_digest" ? "weekly" : "daily",
                            date: date
                        )
                    case "chart_alert":
                        deepLink = .chartAlerts
                    case "daily_report":
                        deepLink = .dailyReport
                    default:
                        break
                    }
                }
                .onOpenURL { url in
                    handleURL(url)
                }
                .sheet(item: $deepLink) { link in
                    NavigationStack {
                        switch link {
                        case .digest(let type, let date):
                            DigestDetailView(type: type, date: date)
                        case .chartAlerts:
                            ChartAlertsView()
                        case .dailyReport:
                            DailyReportView()
                        }
                    }
                }
        }
    }

    /// Handle custom-scheme URLs (onairmusic://). Currently used by the Stripe
    /// Checkout/Portal return flow to bounce back into the app and refresh
    /// the subscription state.
    private func handleURL(_ url: URL) {
        guard url.scheme?.lowercased() == "onairmusic" else { return }

        if url.host?.lowercased() == "subscription" {
            // success / cancel / portal return all warrant a refresh
            NotificationCenter.default.post(name: .subscriptionStatusMayHaveChanged, object: nil)
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    /// Posted when returning from Stripe Checkout/Portal via onairmusic:// URL.
    /// Observers should re-fetch the current subscription.
    static let subscriptionStatusMayHaveChanged = Notification.Name("subscriptionStatusMayHaveChanged")
}
