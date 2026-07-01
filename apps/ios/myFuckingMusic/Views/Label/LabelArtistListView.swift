import SwiftUI

/// List of artists managed by the label.
/// Shows artist name, song count, total plays, and top song.
/// Supports adding new artists and swipe-to-delete.
struct LabelArtistListView: View {
    @State private var viewModel = LabelArtistListViewModel()
    @State private var showingArtistPicker = false

    var body: some View {
        ZStack {
            Color.clear
                .onairGlow(subtle: true)

            if viewModel.isLoading && viewModel.artists.isEmpty {
                LoadingView()
            } else if let errorMessage = viewModel.error, viewModel.artists.isEmpty {
                ErrorView(message: errorMessage) {
                    Task { await viewModel.loadArtists() }
                }
            } else if viewModel.artists.isEmpty {
                emptyStateView
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(viewModel.artists) { artist in
                            NavigationLink {
                                LabelArtistDetailView(
                                    artistId: artist.id,
                                    artistName: artist.artistName,
                                    pictureUrl: artist.pictureUrl
                                )
                            } label: {
                                artistRow(artist)
                            }
                            .buttonStyle(LabelArtistRowButtonStyle())
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    Task {
                                        await viewModel.removeArtist(id: artist.id)
                                    }
                                } label: {
                                    Label("Remove", systemImage: "trash")
                                }
                            }

                            Divider()
                                .overlay(Color.rbHairline)
                        }
                    }
                }
                .refreshable {
                    await viewModel.loadArtists()
                }
            }
        }
        .navigationTitle("My Artists")
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(Color.rbBackground, for: .navigationBar)
        .preferredColorScheme(.dark)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingArtistPicker = true
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 32, height: 32)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(LinearGradient.rbAccentGradient)
                        )
                }
            }
        }
        .sheet(isPresented: $showingArtistPicker) {
            ArtistPickerView { name in
                Task {
                    _ = await viewModel.addArtist(name: name)
                }
            }
        }
        .task {
            await viewModel.loadArtists()
        }
    }

    // MARK: - Artist Row

    private func artistRow(_ artist: LabelArtistSummary) -> some View {
        HStack(spacing: 14) {
            // Artist photo
            if let urlString = artist.pictureUrl, let url = URL(string: urlString) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .scaledToFill()
                } placeholder: {
                    ZStack {
                        Circle()
                            .fill(Color.rbSurface)
                        Image(systemName: "person.fill")
                            .font(.system(size: 18))
                            .foregroundStyle(Color.rbTextTertiary)
                    }
                }
                .frame(width: 48, height: 48)
                .clipShape(Circle())
            } else {
                ZStack {
                    Circle()
                        .fill(Color.rbSurface)
                    Image(systemName: "person.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(Color.rbTextTertiary)
                }
                .frame(width: 48, height: 48)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(artist.artistName)
                    .font(.sora(14, .semibold))
                    .foregroundStyle(Color.rbTextPrimary)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    Label("\(artist.songCount) song\(artist.songCount == 1 ? "" : "s")", systemImage: "music.note")
                        .font(.sora(12, .medium))
                        .foregroundStyle(Color.rbTextSecondary)

                    Label("\(artist.totalPlays)", systemImage: "play.fill")
                        .font(.mono(11, .medium))
                        .foregroundStyle(Color.rbAccent)
                }

                if let topSong = artist.topSong {
                    HStack(spacing: 4) {
                        Image(systemName: "crown.fill")
                            .font(.system(size: 9))
                            .foregroundStyle(Color.rbAccent)

                        Text(topSong)
                            .font(.sora(11, .medium))
                            .foregroundStyle(Color.rbTextTertiary)
                            .lineLimit(1)
                    }
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.rbTextTertiary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.2.slash")
                .font(.system(size: 48))
                .foregroundStyle(Color.rbTextTertiary)

            Text("No Artists Yet")
                .font(.sora(20, .bold))
                .foregroundStyle(Color.rbTextPrimary)

            Text("Tap + to add artists to your label roster")
                .font(.sora(14))
                .foregroundStyle(Color.rbTextSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Button Style

private struct LabelArtistRowButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(configuration.isPressed ? Color.rbAccent.opacity(0.09) : Color.clear)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

#Preview {
    NavigationStack {
        LabelArtistListView()
    }
    .preferredColorScheme(.dark)
}
