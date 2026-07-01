import SwiftUI

/// Settings tab showing user info and logout button.
struct SettingsView: View {
    @Environment(AuthManager.self) private var authManager

    @State private var isLoggingOut = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                // Large title
                Text("Settings")
                    .font(.sora(30, .bold))
                    .tracking(-0.6)
                    .foregroundStyle(Color.rbTextPrimary)
                    .padding(.top, 8)

                // Profile card
                profileCard

                // Admin: "view as role" demo tool (real admins only)
                if authManager.currentUser?.role.uppercased() == "ADMIN" {
                    SettingsSection(
                        header: "Admin",
                        footer: "Preview each role's app experience with real data. Read-only."
                    ) {
                        NavigationLink {
                            ViewAsRoleView()
                        } label: {
                            SettingsRow(
                                icon: "eye",
                                iconColors: [Color(hex: "F59E0B"), Color(hex: "FBBF24")],
                                title: "View as role"
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }

                // Preferences
                SettingsSection(header: "Preferences") {
                    NavigationLink {
                        NotificationsSettingsView()
                    } label: {
                        SettingsRow(
                            icon: "bell.fill",
                            iconColors: [Color.rbAccentDark, Color.rbAccent],
                            title: "Notifications"
                        )
                    }
                    .buttonStyle(.plain)

                    SettingsDivider()

                    NavigationLink {
                        DailyReportSettingsView()
                    } label: {
                        SettingsRow(
                            icon: "doc.text.fill",
                            iconColors: [Color(hex: "3B82F6"), Color(hex: "60A5FA")],
                            title: "Daily Report"
                        )
                    }
                    .buttonStyle(.plain)

                    if let role = authManager.currentUser?.role.uppercased(),
                       role == "ARTIST" || role == "LABEL" {
                        SettingsDivider()

                        NavigationLink {
                            ChartAlertSettingsView()
                        } label: {
                            SettingsRow(
                                icon: "chart.line.uptrend.xyaxis",
                                iconColors: [Color(hex: "10B981"), Color(hex: "34D399")],
                                title: "Chart Alerts"
                            )
                        }
                        .buttonStyle(.plain)
                    }

                    if authManager.currentUser?.role.uppercased() == "STATION" {
                        SettingsDivider()

                        NavigationLink {
                            CompetitorListView()
                        } label: {
                            SettingsRow(
                                icon: "antenna.radiowaves.left.and.right",
                                iconColors: [Color(hex: "10B981"), Color(hex: "34D399")],
                                title: "Competitor Stations"
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }

                // Plan & Billing
                SettingsSection(header: "Plan & Billing") {
                    NavigationLink {
                        SubscriptionView()
                    } label: {
                        SettingsRow(
                            icon: "creditcard.fill",
                            iconColors: [Color.rbGradientStart, Color.rbGradientEnd],
                            title: "Subscription",
                            detail: "Premium"
                        )
                    }
                    .buttonStyle(.plain)
                }

                // onair.music (app info)
                SettingsSection(header: "onair.music") {
                    HStack {
                        SettingsIconTile(icon: "info.circle.fill",
                                         colors: [Color.rbTextTertiary, Color.rbTextSecondary])
                        Text("Version")
                            .font(.sora(14.5, .medium))
                            .foregroundStyle(Color.rbTextPrimary)
                        Spacer()
                        Text("1.0")
                            .font(.mono(13, .medium))
                            .foregroundStyle(Color.rbTextSecondary)
                    }
                    .padding(.vertical, 11)
                    .padding(.horizontal, 14)
                }

                // Log out
                Button {
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
                                .font(.sora(15, .semibold))
                                .foregroundStyle(Color.rbError)
                        }
                        Spacer()
                    }
                    .padding(.vertical, 15)
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(Color.rbError.opacity(0.1))
                    )
                }
                .buttonStyle(.plain)
                .disabled(isLoggingOut)

                // Footer
                Text("onair.music · version 1.0")
                    .font(.sora(11, .regular))
                    .foregroundStyle(Color.rbTextTertiary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, 4)
                    .padding(.bottom, 12)
            }
            .padding(.horizontal, 16)
        }
        .scrollContentBackground(.hidden)
        .onairGlow(subtle: true)
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .preferredColorScheme(.dark)
    }

    // MARK: Profile card

    @ViewBuilder
    private var profileCard: some View {
        if let user = authManager.currentUser {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(LinearGradient.rbAccentGradient)
                    Text(String(user.name.prefix(1)).uppercased())
                        .font(.sora(22, .bold))
                        .foregroundStyle(.white)
                }
                .frame(width: 52, height: 52)

                VStack(alignment: .leading, spacing: 3) {
                    Text(user.name)
                        .font(.sora(16, .bold))
                        .foregroundStyle(Color.rbTextPrimary)
                    Text(user.email)
                        .font(.sora(12.5, .regular))
                        .foregroundStyle(Color.rbTextSecondary)
                        .lineLimit(1)
                }

                Spacer()

                Text(user.role.uppercased())
                    .font(.sora(10, .semibold))
                    .tracking(1.0)
                    .foregroundStyle(Color.rbAccentLight)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(
                        Capsule().fill(Color.rbAccent.opacity(0.16))
                    )
                    .overlay(
                        Capsule().strokeBorder(Color.rbAccent.opacity(0.4), lineWidth: 1)
                    )
            }
            .rbCard(radius: 20)
        } else {
            HStack {
                Text("Not signed in")
                    .font(.sora(14.5, .medium))
                    .foregroundStyle(Color.rbTextSecondary)
                Spacer()
            }
            .rbCard(radius: 20)
        }
    }
}

// MARK: - Settings building blocks

/// Grouped inset-style section: uppercase header + rounded glass container.
private struct SettingsSection<Content: View>: View {
    let header: String
    var footer: String? = nil
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(header.uppercased())
                .font(.sora(10, .semibold))
                .tracking(1.4)
                .foregroundStyle(Color.rbTextTertiary)
                .padding(.leading, 4)

            VStack(spacing: 0) {
                content
            }
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color.white.opacity(0.05))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(Color.rbGlassBorder, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

            if let footer {
                Text(footer)
                    .font(.sora(11.5, .regular))
                    .foregroundStyle(Color.rbTextTertiary)
                    .padding(.leading, 4)
                    .padding(.top, 2)
            }
        }
    }
}

/// A single settings row: colored icon tile + title + optional detail + chevron.
private struct SettingsRow: View {
    let icon: String
    let iconColors: [Color]
    let title: String
    var detail: String? = nil

    var body: some View {
        HStack(spacing: 12) {
            SettingsIconTile(icon: icon, colors: iconColors)

            Text(title)
                .font(.sora(14.5, .medium))
                .foregroundStyle(Color.rbTextPrimary)

            Spacer()

            if let detail {
                Text(detail)
                    .font(.sora(13, .medium))
                    .foregroundStyle(Color.rbAccentLight)
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.rbTextQuaternary)
        }
        .padding(.vertical, 11)
        .padding(.horizontal, 14)
        .contentShape(Rectangle())
    }
}

/// 30pt rounded-square icon tile with a white SF Symbol on a gradient/solid fill.
private struct SettingsIconTile: View {
    let icon: String
    let colors: [Color]

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(
                    LinearGradient(colors: colors,
                                   startPoint: .topLeading,
                                   endPoint: .bottomTrailing)
                )
            Image(systemName: icon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white)
        }
        .frame(width: 30, height: 30)
    }
}

/// Hairline divider inset to align with row text.
private struct SettingsDivider: View {
    var body: some View {
        Rectangle()
            .fill(Color.rbHairline)
            .frame(height: 1)
            .padding(.leading, 56)
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
                            .font(.sora(14.5, .semibold))
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
                .listRowBackground(Color.clear)
            } else if let errorMessage {
                Text(errorMessage)
                    .font(.sora(13, .regular))
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
                                                .font(.sora(14.5, .medium))
                                                .foregroundStyle(Color.rbTextPrimary)
                                            Text(user.email)
                                                .font(.sora(11.5, .regular))
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
                                .font(.sora(10, .semibold))
                                .tracking(1.4)
                                .foregroundStyle(Color.rbTextTertiary)
                        }
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .onairGlow(subtle: true)
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
