import SwiftUI

/// Shows which stations play this label's music most.
/// Stations sorted by affinity percentage with progress bars.
struct StationAffinityView: View {
    @State private var viewModel = StationAffinityViewModel()

    var body: some View {
        ZStack {
            Color.clear
                .onairGlow(subtle: true)

            if viewModel.isLoading && viewModel.affinityData.isEmpty {
                LoadingView()
            } else if let errorMessage = viewModel.error, viewModel.affinityData.isEmpty {
                ErrorView(message: errorMessage) {
                    Task { await viewModel.loadAffinity() }
                }
            } else if viewModel.affinityData.isEmpty {
                emptyStateView
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(viewModel.affinityData) { item in
                            affinityRow(item)

                            Divider()
                                .overlay(Color.rbHairline)
                                .padding(.leading, 68)
                        }
                    }
                    .padding(.vertical, 8)
                }
                .refreshable {
                    await viewModel.loadAffinity()
                }
            }
        }
        .navigationTitle("Station Affinity")
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(Color.rbBackground, for: .navigationBar)
        .preferredColorScheme(.dark)
        .task {
            await viewModel.loadAffinity()
        }
    }

    // MARK: - Affinity Row

    private func affinityRow(_ item: StationAffinityItem) -> some View {
        HStack(spacing: 14) {
            // Station logo / placeholder
            stationLogo(item)

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(item.stationName)
                        .font(.sora(14, .semibold))
                        .foregroundStyle(Color.rbTextPrimary)
                        .lineLimit(1)

                    Spacer()

                    Text(String(format: "%.1f%%", item.affinityPercent))
                        .font(.mono(14, .medium))
                        .foregroundStyle(Color.rbAccent)
                }

                // Progress bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color.white.opacity(0.10))
                            .frame(height: 6)

                        RoundedRectangle(cornerRadius: 3)
                            .fill(LinearGradient.rbAccentGradientH)
                            .frame(
                                width: geometry.size.width * CGFloat(min(item.affinityPercent, 100.0) / 100.0),
                                height: 6
                            )
                    }
                }
                .frame(height: 6)

                Text("\(item.labelPlays) plays")
                    .font(.mono(11))
                    .foregroundStyle(Color.rbTextSecondary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private func stationLogo(_ item: StationAffinityItem) -> some View {
        Group {
            if let logoUrl = item.logoUrl, let url = URL(string: logoUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    default:
                        stationPlaceholder
                    }
                }
            } else {
                stationPlaceholder
            }
        }
        .frame(width: 44, height: 44)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private var stationPlaceholder: some View {
        ZStack {
            Color.rbSurfaceLight
            Image(systemName: "antenna.radiowaves.left.and.right")
                .font(.system(size: 16))
                .foregroundStyle(Color.rbTextTertiary)
        }
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "antenna.radiowaves.left.and.right")
                .font(.system(size: 48))
                .foregroundStyle(Color.rbTextTertiary)

            Text("No Station Data")
                .font(.sora(20, .bold))
                .foregroundStyle(Color.rbTextPrimary)

            Text("Station affinity data will appear once your artists are detected on radio stations")
                .font(.sora(14))
                .foregroundStyle(Color.rbTextSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    NavigationStack {
        StationAffinityView()
    }
    .preferredColorScheme(.dark)
}
