import SwiftUI

/// Settings tab showing user info and logout button.
struct SettingsView: View {
    @Environment(AuthManager.self) private var authManager

    @State private var isLoggingOut = false

    var body: some View {
        List {
            // User info section
            Section {
                if let user = authManager.currentUser {
                    HStack {
                        Text("Name")
                            .foregroundStyle(Color.rbTextPrimary)
                        Spacer()
                        Text(user.name)
                            .foregroundStyle(Color.rbTextSecondary)
                    }
                    .listRowBackground(Color.rbSurface)

                    HStack {
                        Text("Email")
                            .foregroundStyle(Color.rbTextPrimary)
                        Spacer()
                        Text(user.email)
                            .foregroundStyle(Color.rbTextSecondary)
                    }
                    .listRowBackground(Color.rbSurface)

                    HStack {
                        Text("Role")
                            .foregroundStyle(Color.rbTextPrimary)
                        Spacer()
                        Text(user.role.capitalized)
                            .foregroundStyle(Color.rbTextSecondary)
                    }
                    .listRowBackground(Color.rbSurface)
                } else {
                    Text("Not signed in")
                        .foregroundStyle(Color.rbTextSecondary)
                        .listRowBackground(Color.rbSurface)
                }
            } header: {
                Text("Account")
                    .foregroundStyle(Color.rbTextSecondary)
            }

            // Admin: "view as role" demo tool (real admins only)
            if authManager.currentUser?.role.uppercased() == "ADMIN" {
                Section {
                    NavigationLink {
                        ViewAsRoleView()
                    } label: {
                        Label("View as role", systemImage: "eye")
                            .foregroundStyle(Color.rbTextPrimary)
                    }
                    .listRowBackground(Color.rbSurface)
                } header: {
                    Text("Admin")
                        .foregroundStyle(Color.rbTextSecondary)
                } footer: {
                    Text("Preview each role's app experience with real data. Read-only.")
                        .foregroundStyle(Color.rbTextTertiary)
                }
            }

            // App info section
            Section {
                NavigationLink {
                    NotificationsSettingsView()
                } label: {
                    Label("Notifications", systemImage: "bell")
                        .foregroundStyle(Color.rbTextPrimary)
                }
                .listRowBackground(Color.rbSurface)

                NavigationLink {
                    DailyReportSettingsView()
                } label: {
                    Label("Daily Report", systemImage: "doc.text")
                        .foregroundStyle(Color.rbTextPrimary)
                }
                .listRowBackground(Color.rbSurface)

                if let role = authManager.currentUser?.role.uppercased(),
                   role == "ARTIST" || role == "LABEL" {
                    NavigationLink {
                        ChartAlertSettingsView()
                    } label: {
                        Label("Chart Alerts", systemImage: "chart.line.uptrend.xyaxis")
                            .foregroundStyle(Color.rbTextPrimary)
                    }
                    .listRowBackground(Color.rbSurface)
                }

                if authManager.currentUser?.role.uppercased() == "STATION" {
                    NavigationLink {
                        CompetitorListView()
                    } label: {
                        Label("Competitor Stations", systemImage: "antenna.radiowaves.left.and.right")
                            .foregroundStyle(Color.rbTextPrimary)
                    }
                    .listRowBackground(Color.rbSurface)
                }

                HStack {
                    Text("Version")
                        .foregroundStyle(Color.rbTextPrimary)
                    Spacer()
                    Text("1.0")
                        .foregroundStyle(Color.rbTextSecondary)
                }
                .listRowBackground(Color.rbSurface)
            } header: {
                Text("RadioBug")
                    .foregroundStyle(Color.rbTextSecondary)
            }

            // Plan & Billing section
            Section {
                NavigationLink {
                    SubscriptionView()
                } label: {
                    Label("Subscription", systemImage: "creditcard")
                        .foregroundStyle(Color.rbTextPrimary)
                }
                .listRowBackground(Color.rbSurface)
            } header: {
                Text("Plan & Billing")
                    .foregroundStyle(Color.rbTextSecondary)
            }

            // Logout section
            Section {
                Button(role: .destructive) {
                    isLoggingOut = true
                    Task {
                        await authManager.logout()
                        isLoggingOut = false
                    }
                } label: {
                    HStack {
                        Spacer()
                        if isLoggingOut {
                            ProgressView()
                                .tint(Color.rbError)
                        } else {
                            Text("Log Out")
                                .foregroundStyle(Color.rbError)
                                .fontWeight(.semibold)
                        }
                        Spacer()
                    }
                }
                .disabled(isLoggingOut)
                .listRowBackground(Color.rbSurface)
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color.rbBackground)
        .navigationTitle("Settings")
        .toolbarColorScheme(.dark, for: .navigationBar)
        .preferredColorScheme(.dark)
    }
}

#Preview {
    NavigationStack {
        SettingsView()
            .environment(AuthManager())
            .environment(ImpersonationManager())
    }
}

// MARK: - View As Role (Admin)

/// Admin-only picker that lists users grouped by role. Selecting one starts a
/// read-only "view as" session so the admin sees that role's app experience and
/// data. Fetches the real user list (the /admin/* route is never impersonated).
struct ViewAsRoleView: View {
    @Environment(ImpersonationManager.self) private var impersonation
    @Environment(\.dismiss) private var dismiss

    @State private var users: [AdminUser] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    private let roleOrder = ["ARTIST", "LABEL", "STATION", "ADMIN"]

    var body: some View {
        List {
            if impersonation.isImpersonating {
                Section {
                    Button(role: .destructive) {
                        impersonation.stop()
                        dismiss()
                    } label: {
                        Label("Stop viewing as", systemImage: "xmark.circle.fill")
                            .foregroundStyle(Color.rbError)
                    }
                    .listRowBackground(Color.rbSurface)
                }
            }

            if isLoading {
                HStack {
                    Spacer()
                    ProgressView().tint(Color.rbAccent)
                    Spacer()
                }
                .listRowBackground(Color.rbBackground)
            } else if let errorMessage {
                Text(errorMessage)
                    .foregroundStyle(Color.rbError)
                    .listRowBackground(Color.rbSurface)
            } else {
                ForEach(roleOrder, id: \.self) { role in
                    let group = users.filter { $0.role.uppercased() == role && $0.isActive }
                    if !group.isEmpty {
                        Section {
                            ForEach(group) { user in
                                Button {
                                    impersonation.start(user)
                                    dismiss()
                                } label: {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(user.name)
                                                .foregroundStyle(Color.rbTextPrimary)
                                            Text(user.email)
                                                .font(.caption)
                                                .foregroundStyle(Color.rbTextTertiary)
                                        }
                                        Spacer()
                                        if impersonation.target?.id == user.id {
                                            Image(systemName: "checkmark")
                                                .foregroundStyle(Color.rbAccent)
                                        }
                                    }
                                }
                                .listRowBackground(Color.rbSurface)
                            }
                        } header: {
                            Text(role.capitalized)
                                .foregroundStyle(Color.rbTextSecondary)
                        }
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color.rbBackground)
        .navigationTitle("View as role")
        .toolbarColorScheme(.dark, for: .navigationBar)
        .preferredColorScheme(.dark)
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            users = try await APIClient.shared.request(.adminUsers)
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? "Failed to load users"
        }
    }
}
