import SwiftUI

/// Expanded digest stats view opened from push notification tap or deep link.
/// Displays play count, top song, top station, and weekly-specific stats.
struct DigestDetailView: View {
    let type: String  // "daily" or "weekly"
    let date: String  // YYYY-MM-DD

    @State private var isLoading = true
    @State private var digest: DigestDetail?
    @State private var error: String?

    private var digestTitle: String {
        type == "weekly" ? "Weekly Digest" : "Daily Digest"
    }

    private var formattedDate: String {
        // Parse YYYY-MM-DD and format nicely
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let parsedDate = formatter.date(from: date) {
            formatter.dateStyle = .long
            formatter.timeStyle = .none
            return formatter.string(from: parsedDate)
        }
        return date
    }

    var body: some View {
        Group {
            if isLoading {
                LoadingView(message: "Loading digest...")
            } else if let error {
                ErrorView(message: error) {
                    Task { await loadDigest() }
                }
            } else if let digest {
                digestContent(digest)
            } else {
                ErrorView(message: "No digest data available") {
                    Task { await loadDigest() }
                }
            }
        }
        .onairGlow()
        .navigationTitle("Digest")
        .toolbarColorScheme(.dark, for: .navigationBar)
        .preferredColorScheme(.dark)
        .task {
            await loadDigest()
        }
    }

    // MARK: - Content

    @ViewBuilder
    private func digestContent(_ digest: DigestDetail) -> some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 4) {
                    Text(digestTitle)
                        .font(.sora(16, .bold))
                        .foregroundStyle(Color.rbTextPrimary)
                    Text(formattedDate)
                        .font(.sora(13))
                        .foregroundStyle(Color.rbTextSecondary)
                }
                .padding(.top)

                // Hero stat: total play count
                VStack(spacing: 4) {
                    Text("\(digest.playCount)")
                        .font(.sora(64, .heavy))
                        .foregroundStyle(Color.rbAccent)
                    Text("TOTAL PLAYS")
                        .font(.sora(10, .semibold))
                        .tracking(1.4)
                        .foregroundStyle(Color.rbTextTertiary)
                }
                .padding()

                // Week-over-week change (weekly only)
                if type == "weekly", let change = digest.weekOverWeekChange {
                    HStack(spacing: 4) {
                        Image(systemName: change >= 0 ? "arrow.up.right" : "arrow.down.right")
                        Text(String(format: "%+.1f%%", change))
                    }
                    .font(.sora(15, .bold))
                    .foregroundStyle(change >= 0 ? Color.rbSuccess : Color.rbError)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(
                        Capsule().fill((change >= 0 ? Color.rbSuccess : Color.rbError).opacity(0.16))
                    )
                }

                // Top Song card
                if let topSong = digest.topSong {
                    statCard(
                        icon: "music.note",
                        title: "Top Song",
                        primary: topSong.title,
                        secondary: topSong.artist,
                        count: topSong.count
                    )
                }

                // Top Station card
                if let topStation = digest.topStation {
                    statCard(
                        icon: "antenna.radiowaves.left.and.right",
                        title: "Top Station",
                        primary: topStation.name ?? topStation.title,
                        secondary: nil,
                        count: topStation.count
                    )
                }

                // New stations (weekly only)
                if type == "weekly", let newStations = digest.newStationsCount, newStations > 0 {
                    HStack {
                        Image(systemName: "star.fill")
                            .foregroundStyle(Color.rbAccentLight)
                        Text("\(newStations) new station\(newStations == 1 ? "" : "s") played your music")
                            .font(.sora(14))
                            .foregroundStyle(Color.rbTextPrimary)
                    }
                    .frame(maxWidth: .infinity)
                    .rbCard(radius: 18)
                    .padding(.horizontal)
                }
            }
            .padding(.bottom, 32)
        }
    }

    @ViewBuilder
    private func statCard(icon: String, title: String, primary: String, secondary: String?, count: Int) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(Color.rbAccent)
                Text(title.uppercased())
                    .font(.sora(10, .semibold))
                    .tracking(1.4)
                    .foregroundStyle(Color.rbTextTertiary)
                Spacer()
                Text("\(count) plays")
                    .font(.mono(12))
                    .foregroundStyle(Color.rbTextSecondary)
            }

            Text(primary)
                .font(.sora(16, .bold))
                .foregroundStyle(Color.rbTextPrimary)

            if let secondary {
                Text(secondary)
                    .font(.sora(14))
                    .foregroundStyle(Color.rbTextSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .rbCard(radius: 18)
        .padding(.horizontal)
    }

    // MARK: - Data Loading

    private func loadDigest() async {
        isLoading = true
        error = nil
        do {
            let result: DigestDetail = try await APIClient.shared.request(
                .digestDetail(date: date, type: type)
            )
            digest = result
        } catch {
            self.error = "Failed to load digest: \(error.localizedDescription)"
        }
        isLoading = false
    }
}

#Preview {
    NavigationStack {
        DigestDetailView(type: "daily", date: "2026-03-15")
    }
}
