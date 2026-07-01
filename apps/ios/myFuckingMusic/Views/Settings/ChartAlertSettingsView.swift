import SwiftUI

/// Settings for chart alert configuration.
/// Allows enabling/disabling alerts and selecting monitored countries.
struct ChartAlertSettingsView: View {
    @State private var viewModel = SettingsViewModel()

    private let availableCountries: [(code: String, name: String)] = [
        ("RO", "Romania"),
        ("US", "United States"),
        ("GB", "United Kingdom"),
        ("DE", "Germany"),
        ("FR", "France"),
        ("ES", "Spain"),
        ("IT", "Italy"),
        ("NL", "Netherlands"),
        ("BE", "Belgium"),
        ("AT", "Austria"),
        ("CH", "Switzerland"),
        ("PL", "Poland"),
        ("SE", "Sweden"),
        ("NO", "Norway"),
        ("DK", "Denmark"),
        ("PT", "Portugal"),
        ("BR", "Brazil"),
        ("MX", "Mexico"),
        ("CA", "Canada"),
        ("AU", "Australia"),
        ("JP", "Japan"),
    ]

    var body: some View {
        List {
            Section {
                Toggle("Enable Chart Alerts", isOn: Bindable(viewModel).chartAlertsEnabled)
                    .font(.sora(14.5, .medium))
                    .foregroundStyle(Color.rbTextPrimary)
                    .tint(Color.rbAccent)
                    .onChange(of: viewModel.chartAlertsEnabled) {
                        Task { await viewModel.updateChartAlertSettings() }
                    }
                    .listRowBackground(Color.rbSurface)
            } header: {
                Text("Chart Alerts".uppercased())
                    .font(.sora(10, .semibold))
                    .tracking(1.4)
                    .foregroundStyle(Color.rbTextTertiary)
            } footer: {
                Text("Get notified when your songs appear on Shazam, Spotify, or Apple Music charts.")
                    .font(.sora(11.5, .regular))
                    .foregroundStyle(Color.rbTextTertiary)
            }

            if viewModel.chartAlertsEnabled {
                Section {
                    ForEach(availableCountries, id: \.code) { country in
                        Button {
                            toggleCountry(country.code)
                        } label: {
                            HStack {
                                Text(flagEmoji(for: country.code))
                                Text(country.name)
                                    .font(.sora(14.5, .medium))
                                    .foregroundStyle(Color.rbTextPrimary)
                                Spacer()
                                if viewModel.chartAlertCountries.contains(country.code) {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(Color.rbAccent)
                                }
                            }
                        }
                        .listRowBackground(Color.rbSurface)
                    }
                } header: {
                    Text("Countries".uppercased())
                        .font(.sora(10, .semibold))
                        .tracking(1.4)
                        .foregroundStyle(Color.rbTextTertiary)
                } footer: {
                    if viewModel.chartAlertCountries.isEmpty {
                        Text("Select at least one country to receive chart alerts.")
                            .font(.sora(11.5, .regular))
                            .foregroundStyle(Color.rbTextTertiary)
                    } else {
                        Text("\(viewModel.chartAlertCountries.count) country(ies) selected.")
                            .font(.sora(11.5, .regular))
                            .foregroundStyle(Color.rbTextTertiary)
                    }
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
        .navigationTitle("Chart Alerts")
        .toolbarColorScheme(.dark, for: .navigationBar)
        .preferredColorScheme(.dark)
        .task {
            await viewModel.loadSettings()
        }
    }

    private func toggleCountry(_ code: String) {
        if let index = viewModel.chartAlertCountries.firstIndex(of: code) {
            viewModel.chartAlertCountries.remove(at: index)
        } else {
            viewModel.chartAlertCountries.append(code)
        }
        Task { await viewModel.updateChartAlertSettings() }
    }

    /// Convert a 2-letter country code to its flag emoji.
    private func flagEmoji(for countryCode: String) -> String {
        let base: UInt32 = 127397
        return countryCode.uppercased().unicodeScalars.compactMap {
            UnicodeScalar(base + $0.value).map(String.init)
        }.joined()
    }
}

#Preview {
    NavigationStack {
        ChartAlertSettingsView()
    }
}
