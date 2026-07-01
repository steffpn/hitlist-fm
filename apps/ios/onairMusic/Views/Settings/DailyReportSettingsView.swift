import SwiftUI

/// Settings for daily report configuration.
/// Allows enabling/disabling reports, setting delivery time, and timezone.
struct DailyReportSettingsView: View {
    @State private var viewModel = SettingsViewModel()

    private let timezones = [
        "Europe/Bucharest",
        "Europe/London",
        "Europe/Berlin",
        "Europe/Paris",
        "Europe/Madrid",
        "Europe/Rome",
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "Asia/Tokyo",
        "Asia/Shanghai",
        "Australia/Sydney",
    ]

    /// Convert stored HH:mm string to a Date for the DatePicker.
    private var timeBinding: Binding<Date> {
        Binding<Date>(
            get: {
                let parts = viewModel.dailyReportTime.split(separator: ":")
                let hour = Int(parts.first ?? "9") ?? 9
                let minute = Int(parts.last ?? "0") ?? 0
                var components = DateComponents()
                components.hour = hour
                components.minute = minute
                return Calendar.current.date(from: components) ?? Date()
            },
            set: { newDate in
                let components = Calendar.current.dateComponents([.hour, .minute], from: newDate)
                let hour = components.hour ?? 9
                let minute = components.minute ?? 0
                viewModel.dailyReportTime = String(format: "%02d:%02d", hour, minute)
                Task { await viewModel.updateDailyReportSettings() }
            }
        )
    }

    var body: some View {
        List {
            // The actual reports (today + history)
            Section {
                NavigationLink {
                    DailyReportView()
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "doc.text.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(Color.rbAccent)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("View Reports")
                                .font(.sora(14.5, .medium))
                                .foregroundStyle(Color.rbTextPrimary)
                            Text("Today's report and history")
                                .font(.sora(11.5))
                                .foregroundStyle(Color.rbTextTertiary)
                        }
                    }
                }
                .listRowBackground(Color.rbSurface)
            }

            Section {
                Toggle("Enable Daily Report", isOn: Bindable(viewModel).dailyReportEnabled)
                    .font(.sora(14.5, .medium))
                    .foregroundStyle(Color.rbTextPrimary)
                    .tint(Color.rbAccent)
                    .onChange(of: viewModel.dailyReportEnabled) {
                        Task { await viewModel.updateDailyReportSettings() }
                    }
                    .listRowBackground(Color.rbSurface)
            } header: {
                Text("Daily Report".uppercased())
                    .font(.sora(10, .semibold))
                    .tracking(1.4)
                    .foregroundStyle(Color.rbTextTertiary)
            } footer: {
                Text("Receive a daily summary of your play stats, tips, and insights.")
                    .font(.sora(11.5, .regular))
                    .foregroundStyle(Color.rbTextTertiary)
            }

            if viewModel.dailyReportEnabled {
                Section {
                    DatePicker("Delivery Time", selection: timeBinding, displayedComponents: .hourAndMinute)
                        .font(.sora(14.5, .medium))
                        .foregroundStyle(Color.rbTextPrimary)
                        .tint(Color.rbAccent)
                        .listRowBackground(Color.rbSurface)

                    Picker("Timezone", selection: Bindable(viewModel).dailyReportTimezone) {
                        ForEach(timezones, id: \.self) { tz in
                            Text(tz.replacingOccurrences(of: "_", with: " "))
                                .tag(tz)
                        }
                    }
                    .font(.sora(14.5, .medium))
                    .foregroundStyle(Color.rbTextPrimary)
                    .tint(Color.rbAccent)
                    .onChange(of: viewModel.dailyReportTimezone) {
                        Task { await viewModel.updateDailyReportSettings() }
                    }
                    .listRowBackground(Color.rbSurface)
                } header: {
                    Text("Schedule".uppercased())
                        .font(.sora(10, .semibold))
                        .tracking(1.4)
                        .foregroundStyle(Color.rbTextTertiary)
                }
            }

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
        .navigationTitle("Daily Report")
        .toolbarColorScheme(.dark, for: .navigationBar)
        .preferredColorScheme(.dark)
        .task {
            await viewModel.loadSettings()
        }
    }
}

#Preview {
    NavigationStack {
        DailyReportSettingsView()
    }
}
