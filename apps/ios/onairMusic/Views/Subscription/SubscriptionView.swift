import SwiftUI

/// Subscription management screen.
/// Shows current plan details for premium users or upgrade CTA for free users.
struct SubscriptionView: View {
    @State private var viewModel = SubscriptionViewModel()
    @Environment(\.openURL) private var openURL

    var body: some View {
        List {
            if viewModel.isLoading {
                Section {
                    HStack {
                        Spacer()
                        ProgressView()
                            .tint(Color.rbAccent)
                        Spacer()
                    }
                    .listRowBackground(Color.rbGlassTint)
                }
            } else if viewModel.isFreeTier {
                // Free tier - upgrade CTA
                freeUserSection
            } else {
                // Premium - show plan details
                premiumUserSection
            }

            // Feature list
            if let features = viewModel.subscriptionInfo?.features, !features.isEmpty {
                Section {
                    ForEach(features, id: \.self) { feature in
                        HStack(spacing: 10) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(Color.rbAccent)
                                .font(.subheadline)
                            Text(feature)
                                .foregroundStyle(Color.rbTextPrimary)
                                .font(.sora(14))
                        }
                        .listRowBackground(Color.rbGlassTint)
                    }
                } header: {
                    Text("WHAT'S INCLUDED")
                        .font(.sora(10, .semibold))
                        .tracking(1.4)
                        .foregroundStyle(Color.rbTextTertiary)
                }
            }

            if let error = viewModel.error {
                Section {
                    Text(error)
                        .foregroundStyle(Color.rbError)
                        .font(.caption)
                        .listRowBackground(Color.rbGlassTint)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .onairGlow(subtle: true)
        .navigationTitle("Subscription")
        .toolbarColorScheme(.dark, for: .navigationBar)
        .preferredColorScheme(.dark)
        .task {
            await viewModel.loadSubscription()
        }
        .onReceive(NotificationCenter.default.publisher(for: .subscriptionStatusMayHaveChanged)) { _ in
            // Back from Stripe Checkout/Portal via hitlist:// — refresh state.
            Task { await viewModel.loadSubscription() }
        }
        .onChange(of: viewModel.checkoutURL) { _, url in
            if let url { openURL(url) }
        }
        .onChange(of: viewModel.portalURL) { _, url in
            if let url { openURL(url) }
        }
    }

    // MARK: - Free User Section

    private var freeUserSection: some View {
        Section {
            VStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(Color.rbAccent)
                        .frame(width: 64, height: 64)
                        .shadow(color: Color.rbAccent.opacity(0.5), radius: 14, y: 8)
                    Image(systemName: "star.fill")
                        .font(.system(size: 26))
                        .foregroundStyle(.white)
                }

                VStack(spacing: 6) {
                    Text("Upgrade to ")
                        .foregroundStyle(Color.rbTextPrimary)
                        .font(.sora(22, .bold))
                    + Text("Premium")
                        .foregroundStyle(Color.rbAccentLight)
                        .font(.sora(22, .bold))
                }

                Text("Unlock advanced analytics, daily reports, chart alerts, and more.")
                    .foregroundStyle(Color.rbTextSecondary)
                    .font(.sora(14))
                    .multilineTextAlignment(.center)

                Button {
                    Task {
                        // Default to plan 1 (premium monthly)
                        await viewModel.createCheckout(planId: 1, billingInterval: "monthly")
                    }
                } label: {
                    Text("Upgrade Now")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(RBAccentButtonStyle())
            }
            .padding(.vertical, 16)
            .listRowBackground(Color.rbGlassTint)
        } header: {
            Text("CURRENT PLAN: FREE")
                .font(.sora(10, .semibold))
                .tracking(1.4)
                .foregroundStyle(Color.rbTextTertiary)
        }
    }

    // MARK: - Premium User Section

    private var premiumUserSection: some View {
        Group {
            Section {
                if let plan = viewModel.subscriptionInfo?.plan {
                    HStack {
                        Text("Plan")
                            .foregroundStyle(Color.rbTextPrimary)
                            .font(.sora(14))
                        Spacer()
                        Text(plan.name)
                            .foregroundStyle(Color.rbAccentLight)
                            .font(.sora(14, .semibold))
                    }
                    .listRowBackground(Color.rbGlassTint)

                    HStack {
                        Text("Tier")
                            .foregroundStyle(Color.rbTextPrimary)
                            .font(.sora(14))
                        Spacer()
                        Text(plan.tier.capitalized)
                            .foregroundStyle(Color.rbTextSecondary)
                            .font(.sora(14))
                    }
                    .listRowBackground(Color.rbGlassTint)
                }

                if let sub = viewModel.subscriptionInfo?.subscription {
                    HStack {
                        Text("Status")
                            .foregroundStyle(Color.rbTextPrimary)
                            .font(.sora(14))
                        Spacer()
                        statusPill(sub.status)
                    }
                    .listRowBackground(Color.rbGlassTint)

                    HStack {
                        Text("Billing")
                            .foregroundStyle(Color.rbTextPrimary)
                            .font(.sora(14))
                        Spacer()
                        Text(sub.billingInterval.capitalized)
                            .foregroundStyle(Color.rbTextSecondary)
                            .font(.sora(14))
                    }
                    .listRowBackground(Color.rbGlassTint)

                    if let periodEnd = sub.currentPeriodEnd {
                        HStack {
                            Text("Renews")
                                .foregroundStyle(Color.rbTextPrimary)
                                .font(.sora(14))
                            Spacer()
                            Text(formattedDate(periodEnd))
                                .foregroundStyle(Color.rbTextSecondary)
                                .font(.mono(13))
                        }
                        .listRowBackground(Color.rbGlassTint)
                    }

                    if sub.cancelAtPeriodEnd {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.triangle")
                                .foregroundStyle(Color.rbWarning)
                            Text("Cancels at end of period")
                                .foregroundStyle(Color.rbWarning)
                                .font(.sora(13))
                        }
                        .listRowBackground(Color.rbGlassTint)
                    }
                }
            } header: {
                Text("YOUR PLAN")
                    .font(.sora(10, .semibold))
                    .tracking(1.4)
                    .foregroundStyle(Color.rbTextTertiary)
            }

            // Manage billing
            Section {
                Button {
                    Task { await viewModel.createPortal() }
                } label: {
                    HStack {
                        Spacer()
                        Label("Manage Billing", systemImage: "creditcard")
                            .foregroundStyle(Color.rbAccent)
                            .font(.sora(14, .medium))
                        Spacer()
                    }
                }
                .listRowBackground(Color.rbGlassTint)
            }
        }
    }

    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }

    /// Tinted status pill: green for active, amber otherwise.
    private func statusPill(_ status: String) -> some View {
        let color: Color = status == "active" ? Color.rbSuccess : Color.rbWarning
        return Text(status.capitalized)
            .font(.sora(12, .semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(Capsule().fill(color.opacity(0.16)))
    }
}

#Preview {
    NavigationStack {
        SubscriptionView()
    }
}
