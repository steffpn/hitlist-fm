import SwiftUI

/// Daily report screen showing today's report and past report history.
struct DailyReportView: View {
    @State private var viewModel = DailyReportsViewModel()

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
            } else if let report = viewModel.todayReport {
                // Today's stats
                Section {
                    if let content = Optional(report.content) {
                        if let totalPlays = content.totalPlays {
                            StatRow(label: "Total Plays", value: "\(totalPlays)")
                        }
                        if let yesterdayPlays = content.yesterdayPlays {
                            StatRow(label: "Yesterday", value: "\(yesterdayPlays)")
                        }
                        if let dayBeforePlays = content.dayBeforePlays {
                            StatRow(label: "Day Before", value: "\(dayBeforePlays)")
                        }
                        if let weekPercent = content.weekOverWeekPercent {
                            StatRow(
                                label: "Week over Week",
                                value: "\(weekPercent > 0 ? "+" : "")\(weekPercent)%",
                                valueColor: weekPercent >= 0 ? Color.rbSuccess : Color.rbError
                            )
                        }
                        if let uniqueSongs = content.uniqueSongs {
                            StatRow(label: "Unique Songs", value: "\(uniqueSongs)")
                        }
                        if let totalArtists = content.totalArtists {
                            StatRow(label: "Total Artists", value: "\(totalArtists)")
                        }
                        if let discovery = content.discoveryScore {
                            StatRow(label: "Discovery Score", value: "\(discovery)%")
                        }
                    }
                } header: {
                    Text("TODAY'S REPORT")
                        .font(.sora(10, .semibold))
                        .tracking(1.4)
                        .foregroundStyle(Color.rbTextTertiary)
                }

                // Tips
                if !report.tips.isEmpty {
                    Section {
                        ForEach(Array(report.tips.enumerated()), id: \.offset) { _, tip in
                            TipCard(tip: tip)
                                .listRowBackground(Color.rbGlassTint)
                        }
                    } header: {
                        Text("TIPS & INSIGHTS")
                            .font(.sora(10, .semibold))
                            .tracking(1.4)
                            .foregroundStyle(Color.rbTextTertiary)
                    }
                }
            } else {
                // Empty state
                Section {
                    HStack {
                        Spacer()
                        VStack(spacing: 12) {
                            Image(systemName: "doc.text")
                                .font(.largeTitle)
                                .foregroundStyle(Color.rbTextTertiary)
                            Text("No report yet")
                                .foregroundStyle(Color.rbTextSecondary)
                                .font(.sora(17, .semibold))
                            Text("Your daily report will appear here once it's generated.")
                                .foregroundStyle(Color.rbTextTertiary)
                                .font(.sora(14))
                                .multilineTextAlignment(.center)
                        }
                        .padding(.vertical, 32)
                        Spacer()
                    }
                    .listRowBackground(Color.rbGlassTint)
                }
            }

            // Past reports
            if !viewModel.pastReports.isEmpty {
                Section {
                    ForEach(viewModel.pastReports) { report in
                        NavigationLink {
                            PastReportDetailView(report: report)
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(formattedDate(report.reportDate))
                                        .foregroundStyle(Color.rbTextPrimary)
                                        .font(.sora(14, .medium))
                                    if let plays = report.content.totalPlays {
                                        Text("\(plays) total plays")
                                            .foregroundStyle(Color.rbTextSecondary)
                                            .font(.mono(12))
                                    }
                                }
                                Spacer()
                                if report.isPremium {
                                    Image(systemName: "star.fill")
                                        .foregroundStyle(Color.rbAccentLight)
                                        .font(.caption)
                                }
                            }
                        }
                        .listRowBackground(Color.rbGlassTint)
                    }
                } header: {
                    Text("PAST REPORTS")
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
        .navigationTitle("Reports")
        .toolbarColorScheme(.dark, for: .navigationBar)
        .preferredColorScheme(.dark)
        .refreshable {
            await viewModel.loadAll()
        }
        .task {
            await viewModel.loadAll()
        }
    }

    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
}

// MARK: - Stat Row

/// A single key-value stat row used in the daily report.
private struct StatRow: View {
    let label: String
    let value: String
    var valueColor: Color = Color.rbAccent

    var body: some View {
        HStack {
            Text(label)
                .foregroundStyle(Color.rbTextPrimary)
                .font(.sora(14))
            Spacer()
            Text(value)
                .foregroundStyle(valueColor)
                .font(.mono(14, .medium))
        }
        .listRowBackground(Color.rbGlassTint)
    }
}

// MARK: - Tip Card

/// A styled card for displaying a daily report tip.
private struct TipCard: View {
    let tip: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "lightbulb.fill")
                .foregroundStyle(Color.rbAccent)
                .font(.subheadline)
                .padding(.top, 2)
            Text(tip)
                .foregroundStyle(Color.rbTextPrimary)
                .font(.sora(14))
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Past Report Detail

/// Detail view for a past daily report.
private struct PastReportDetailView: View {
    let report: DailyReport

    var body: some View {
        List {
            Section {
                if let totalPlays = report.content.totalPlays {
                    StatRow(label: "Total Plays", value: "\(totalPlays)")
                }
                if let yesterdayPlays = report.content.yesterdayPlays {
                    StatRow(label: "Yesterday", value: "\(yesterdayPlays)")
                }
                if let dayBeforePlays = report.content.dayBeforePlays {
                    StatRow(label: "Day Before", value: "\(dayBeforePlays)")
                }
                if let weekPercent = report.content.weekOverWeekPercent {
                    StatRow(
                        label: "Week over Week",
                        value: "\(weekPercent > 0 ? "+" : "")\(weekPercent)%",
                        valueColor: weekPercent >= 0 ? Color.rbSuccess : Color.rbError
                    )
                }
                if let uniqueSongs = report.content.uniqueSongs {
                    StatRow(label: "Unique Songs", value: "\(uniqueSongs)")
                }
                if let totalArtists = report.content.totalArtists {
                    StatRow(label: "Total Artists", value: "\(totalArtists)")
                }
                if let discovery = report.content.discoveryScore {
                    StatRow(label: "Discovery Score", value: "\(discovery)%")
                }
            } header: {
                Text("STATS")
                    .font(.sora(10, .semibold))
                    .tracking(1.4)
                    .foregroundStyle(Color.rbTextTertiary)
            }

            if !report.tips.isEmpty {
                Section {
                    ForEach(Array(report.tips.enumerated()), id: \.offset) { _, tip in
                        TipCard(tip: tip)
                            .listRowBackground(Color.rbGlassTint)
                    }
                } header: {
                    Text("TIPS & INSIGHTS")
                        .font(.sora(10, .semibold))
                        .tracking(1.4)
                        .foregroundStyle(Color.rbTextTertiary)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .onairGlow(subtle: true)
        .navigationTitle(formattedDate(report.reportDate))
        .toolbarColorScheme(.dark, for: .navigationBar)
        .preferredColorScheme(.dark)
    }

    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
}

#Preview {
    NavigationStack {
        DailyReportView()
    }
}
