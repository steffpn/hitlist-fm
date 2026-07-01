import SwiftUI

/// List of chart alerts showing platform, song, artist, position, and country.
/// Supports filtering by unread and swipe-to-mark-as-read.
struct ChartAlertsView: View {
    @State private var viewModel = ChartAlertsViewModel()

    var body: some View {
        List {
            // Filter toggle
            Section {
                Toggle(
                    "Show Unread Only",
                    isOn: Bindable(viewModel).showUnreadOnly
                )
                .font(.sora(14))
                .foregroundStyle(Color.rbTextPrimary)
                .tint(Color.rbAccent)
                .listRowBackground(Color.rbGlassTint)
            }

            // Alerts list
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
            } else if viewModel.filteredAlerts.isEmpty {
                Section {
                    HStack {
                        Spacer()
                        VStack(spacing: 12) {
                            Image(systemName: "chart.line.uptrend.xyaxis")
                                .font(.largeTitle)
                                .foregroundStyle(Color.rbTextTertiary)
                            Text("No chart alerts yet")
                                .foregroundStyle(Color.rbTextSecondary)
                                .font(.sora(17, .semibold))
                            Text("When your songs appear on charts, you'll see alerts here.")
                                .foregroundStyle(Color.rbTextTertiary)
                                .font(.sora(14))
                                .multilineTextAlignment(.center)
                        }
                        .padding(.vertical, 32)
                        Spacer()
                    }
                    .listRowBackground(Color.rbGlassTint)
                }
            } else {
                Section {
                    ForEach(viewModel.filteredAlerts) { alert in
                        ChartAlertRow(alert: alert)
                            .swipeActions(edge: .trailing) {
                                if !alert.isRead {
                                    Button {
                                        Task { await viewModel.markAsRead([alert.id]) }
                                    } label: {
                                        Label("Read", systemImage: "envelope.open")
                                    }
                                    .tint(Color.rbAccent)
                                }
                            }
                            .listRowBackground(Color.rbGlassTint)
                    }
                } header: {
                    HStack {
                        Text("ALERTS")
                            .font(.sora(10, .semibold))
                            .tracking(1.4)
                            .foregroundStyle(Color.rbTextTertiary)
                        Spacer()
                        if viewModel.unreadCount > 0 {
                            Text("\(viewModel.unreadCount) unread")
                                .font(.mono(11))
                                .foregroundStyle(Color.rbAccentLight)
                        }
                    }
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
        .navigationTitle("Chart Alerts")
        .toolbarColorScheme(.dark, for: .navigationBar)
        .preferredColorScheme(.dark)
        .refreshable {
            await viewModel.loadAlerts()
        }
        .task {
            await viewModel.loadAlerts()
        }
    }
}

// MARK: - Chart Alert Row

/// A single chart alert row with platform icon, song details, and unread indicator.
private struct ChartAlertRow: View {
    let alert: ChartAlert

    var body: some View {
        HStack(spacing: 12) {
            // Unread indicator
            Circle()
                .fill(alert.isRead ? Color.clear : Color.rbAccent)
                .frame(width: 8, height: 8)

            // Platform icon
            platformIcon
                .font(.title2)
                .frame(width: 32)

            // Details
            VStack(alignment: .leading, spacing: 4) {
                Text(alert.songTitle)
                    .foregroundStyle(Color.rbTextPrimary)
                    .font(.sora(14, .semibold))
                    .lineLimit(1)

                Text(alert.artistName)
                    .foregroundStyle(Color.rbTextSecondary)
                    .font(.sora(13))
                    .lineLimit(1)

                Text(alert.message)
                    .foregroundStyle(Color.rbTextTertiary)
                    .font(.sora(11))
                    .lineLimit(2)
            }

            Spacer()

            // Position + country
            VStack(alignment: .trailing, spacing: 4) {
                Text("#\(alert.position)")
                    .foregroundStyle(Color.rbAccent)
                    .font(.mono(17, .medium))

                Text(flagEmoji(for: alert.country))
                    .font(.title3)
            }
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private var platformIcon: some View {
        switch alert.platform.lowercased() {
        case "shazam":
            Image(systemName: "shazam.logo.fill")
                .foregroundStyle(.blue)
        case "spotify":
            Image(systemName: "waveform")
                .foregroundStyle(.green)
        case "apple_music", "applemusic", "apple music":
            Image(systemName: "music.note")
                .foregroundStyle(.pink)
        default:
            Image(systemName: "chart.bar.fill")
                .foregroundStyle(Color.rbAccent)
        }
    }

    private func flagEmoji(for countryCode: String) -> String {
        let base: UInt32 = 127397
        return countryCode.uppercased().unicodeScalars.compactMap {
            UnicodeScalar(base + $0.value).map(String.init)
        }.joined()
    }
}

#Preview {
    NavigationStack {
        ChartAlertsView()
    }
}
