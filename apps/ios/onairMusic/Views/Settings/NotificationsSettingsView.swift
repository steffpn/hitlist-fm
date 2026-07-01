import SwiftUI

/// Notification preferences view with daily/weekly digest toggles.
/// Shows a warning hint when push permissions are denied.
struct NotificationsSettingsView: View {
    @State private var viewModel = NotificationsViewModel()
    @Environment(NotificationManager.self) private var notificationManager

    var body: some View {
        @Bindable var viewModel = viewModel

        List {
            // Digest toggles
            Section {
                Toggle("Daily Digest", isOn: $viewModel.dailyDigestEnabled)
                    .font(.sora(14.5, .medium))
                    .foregroundStyle(Color.rbTextPrimary)
                    .tint(Color.rbAccent)
                    .onChange(of: viewModel.dailyDigestEnabled) {
                        Task { await viewModel.updatePreferences() }
                    }
                    .listRowBackground(Color.rbSurface)

                Toggle("Weekly Digest", isOn: $viewModel.weeklyDigestEnabled)
                    .font(.sora(14.5, .medium))
                    .foregroundStyle(Color.rbTextPrimary)
                    .tint(Color.rbAccent)
                    .onChange(of: viewModel.weeklyDigestEnabled) {
                        Task { await viewModel.updatePreferences() }
                    }
                    .listRowBackground(Color.rbSurface)
            } header: {
                Text("Notifications".uppercased())
                    .font(.sora(10, .semibold))
                    .tracking(1.4)
                    .foregroundStyle(Color.rbTextTertiary)
            } footer: {
                Text("Digests are sent at 9:00 AM Romania time.")
                    .font(.sora(11.5, .regular))
                    .foregroundStyle(Color.rbTextTertiary)
            }

            // Permission denied hint
            if notificationManager.pushPermissionDenied {
                Section {
                    Label {
                        Text("Push notifications are disabled. Enable them in iOS Settings to receive digests.")
                            .font(.sora(13, .regular))
                            .foregroundStyle(Color.rbTextSecondary)
                    } icon: {
                        Image(systemName: "exclamationmark.triangle")
                            .foregroundStyle(Color.rbWarning)
                    }
                    .listRowBackground(Color.rbSurface)
                }
            }

            // Error display
            if let error = viewModel.error {
                Section {
                    Text(error)
                        .font(.sora(12, .regular))
                        .foregroundStyle(Color.rbError)
                        .listRowBackground(Color.rbSurface)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .onairGlow(subtle: true)
        .navigationTitle("Notifications")
        .toolbarColorScheme(.dark, for: .navigationBar)
        .preferredColorScheme(.dark)
        .task {
            await viewModel.loadPreferences()
            await notificationManager.checkPermissionStatus()
        }
    }
}

#Preview {
    NavigationStack {
        NotificationsSettingsView()
            .environment(NotificationManager())
    }
}
