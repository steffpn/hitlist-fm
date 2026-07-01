import SwiftUI

/// Sheet for adding a new song to the artist's monitored list.
///
/// Primary flow: search the catalog (GET /artist/browse-tracks, Deezer-backed) with
/// debounce, pick a result — title/artist/ISRC fill automatically — then confirm.
/// Fallback: manual entry of title + ISRC for songs missing from the catalog.
struct AddSongSheet: View {
    let viewModel: MonitoredSongsViewModel
    @Environment(\.dismiss) private var dismiss

    private enum Mode {
        case search
        case manual
    }

    @State private var mode: Mode = .search

    // Search flow
    @State private var searchQuery = ""
    @State private var results: [BrowseTrack] = []
    @State private var isSearching = false
    @State private var selectedTrack: BrowseTrack?

    // Manual flow
    @State private var songTitle = ""
    @State private var artistName = ""
    @State private var isrc = ""

    @State private var isSubmitting = false
    @State private var errorMessage: String?

    @FocusState private var focusedField: Field?

    private enum Field: Hashable {
        case search
        case songTitle
        case isrc
    }

    private var isManualFormValid: Bool {
        !songTitle.trimmingCharacters(in: .whitespaces).isEmpty
            && !isrc.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Group {
                    switch mode {
                    case .search:
                        searchFlow
                    case .manual:
                        manualFlow
                    }
                }
            }
            .onairGlow()
            .navigationTitle("Add Song")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbarBackground(Color.rbBackground, for: .navigationBar)
            .preferredColorScheme(.dark)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundStyle(Color.rbTextSecondary)
                }
            }
        }
    }

    // MARK: - Search Flow

    private var searchFlow: some View {
        VStack(spacing: 0) {
            // Search field
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.rbTextTertiary)

                TextField("Search your songs in the catalog...", text: $searchQuery)
                    .font(.sora(14))
                    .foregroundStyle(Color.rbTextPrimary)
                    .tint(Color.rbAccent)
                    .autocorrectionDisabled()
                    .focused($focusedField, equals: .search)

                if isSearching {
                    ProgressView()
                        .tint(Color.rbAccent)
                        .controlSize(.small)
                } else if !searchQuery.isEmpty {
                    Button {
                        searchQuery = ""
                        results = []
                        selectedTrack = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(Color.rbTextTertiary)
                    }
                }
            }
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.white.opacity(0.06))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(Color.rbGlassBorder, lineWidth: 1)
            )
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .task(id: searchQuery) {
                // Debounce: wait 350ms after the last keystroke, then search.
                guard !searchQuery.trimmingCharacters(in: .whitespaces).isEmpty else {
                    results = []
                    isSearching = false
                    return
                }
                do {
                    try await Task.sleep(for: .milliseconds(350))
                    await performSearch()
                } catch {
                    // Cancelled: a newer query was typed
                }
            }

            // Selected track confirmation card
            if let track = selectedTrack {
                selectedTrackCard(track)
                    .padding(.horizontal, 20)
                    .padding(.top, 14)
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.sora(12))
                    .foregroundStyle(Color.rbError)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
                    .padding(.top, 10)
            }

            // Results list
            resultsList

            Spacer(minLength: 0)

            // Manual entry fallback
            Button {
                mode = .manual
                errorMessage = nil
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "square.and.pencil")
                        .font(.system(size: 12))
                    Text("Can't find it? Enter details manually")
                }
                .font(.sora(13, .medium))
                .foregroundStyle(Color.rbAccentLight)
                .padding(.vertical, 12)
            }
            .padding(.bottom, 8)
        }
    }

    @ViewBuilder
    private var resultsList: some View {
        if results.isEmpty && !isSearching && !searchQuery.isEmpty {
            VStack(spacing: 10) {
                Image(systemName: "music.note.list")
                    .font(.system(size: 28))
                    .foregroundStyle(Color.rbTextTertiary)
                Text("No matches in the catalog")
                    .font(.sora(14, .medium))
                    .foregroundStyle(Color.rbTextSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 40)
        } else if results.isEmpty && searchQuery.isEmpty {
            VStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 28))
                    .foregroundStyle(Color.rbTextTertiary)
                Text("Search by song or artist name")
                    .font(.sora(14, .medium))
                    .foregroundStyle(Color.rbTextSecondary)
                Text("Title and ISRC are filled in automatically.")
                    .font(.sora(12))
                    .foregroundStyle(Color.rbTextTertiary)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 40)
        } else {
            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(results) { track in
                        trackRow(track)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 14)
                .padding(.bottom, 12)
            }
        }
    }

    private func trackRow(_ track: BrowseTrack) -> some View {
        let isSelected = selectedTrack?.id == track.id
        return Button {
            selectedTrack = track
            errorMessage = nil
            focusedField = nil
        } label: {
            HStack(spacing: 12) {
                trackCover(track.coverUrl, size: 44)

                VStack(alignment: .leading, spacing: 3) {
                    Text(track.title)
                        .font(.sora(14, .semibold))
                        .foregroundStyle(Color.rbTextPrimary)
                        .lineLimit(1)

                    Text(track.artist)
                        .font(.sora(12))
                        .foregroundStyle(Color.rbTextSecondary)
                        .lineLimit(1)

                    if let isrc = track.isrc {
                        Text(isrc)
                            .font(.mono(10))
                            .foregroundStyle(Color.rbTextQuaternary)
                    }
                }

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "plus.circle")
                    .font(.system(size: 20))
                    .foregroundStyle(isSelected ? Color.rbAccent : Color.rbTextTertiary)
            }
            .padding(10)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(isSelected ? Color.rbAccent.opacity(0.12) : Color.white.opacity(0.04))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(
                        isSelected ? Color.rbAccent.opacity(0.6) : Color.rbGlassBorder.opacity(0.6),
                        lineWidth: 1
                    )
            )
        }
        .buttonStyle(.plain)
    }

    private func selectedTrackCard(_ track: BrowseTrack) -> some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                trackCover(track.coverUrl, size: 52)

                VStack(alignment: .leading, spacing: 3) {
                    Text(track.title)
                        .font(.sora(15, .bold))
                        .foregroundStyle(Color.rbTextPrimary)
                        .lineLimit(1)

                    Text(track.artist)
                        .font(.sora(12.5))
                        .foregroundStyle(Color.rbTextSecondary)
                        .lineLimit(1)

                    Text(track.isrc ?? "No ISRC available")
                        .font(.mono(11))
                        .foregroundStyle(track.isrc == nil ? Color.rbWarning : Color.rbTextTertiary)
                }

                Spacer()

                Button {
                    selectedTrack = nil
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(Color.rbTextTertiary)
                }
            }

            if track.isrc == nil {
                Text("This track has no ISRC in the catalog — add it manually instead.")
                    .font(.sora(11.5))
                    .foregroundStyle(Color.rbWarning)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button {
                Task { await addSelectedTrack(track) }
            } label: {
                HStack(spacing: 10) {
                    if isSubmitting {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 15, weight: .semibold))
                    }
                    Text("Monitor This Song")
                        .font(.sora(15, .bold))
                }
                .foregroundStyle(track.isrc != nil ? .white : Color.rbTextTertiary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .background {
                    if track.isrc != nil {
                        LinearGradient.rbAccentGradient
                    } else {
                        Color.white.opacity(0.06)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .disabled(track.isrc == nil || isSubmitting)
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.rbAccent.opacity(0.08))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(Color.rbAccent.opacity(0.35), lineWidth: 1)
        )
    }

    private func trackCover(_ urlString: String?, size: CGFloat) -> some View {
        Group {
            if let urlString, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    default:
                        coverPlaceholder
                    }
                }
            } else {
                coverPlaceholder
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private var coverPlaceholder: some View {
        ZStack {
            Color.rbAccent.opacity(0.15)
            Image(systemName: "music.note")
                .font(.system(size: 16))
                .foregroundStyle(Color.rbAccentLight)
        }
    }

    // MARK: - Manual Flow (fallback)

    private var manualFlow: some View {
        ScrollView {
            VStack(spacing: 24) {
                headerSection

                formSection

                if let errorMessage {
                    Text(errorMessage)
                        .font(.sora(12))
                        .foregroundStyle(Color.rbError)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                submitButton

                Button {
                    mode = .search
                    errorMessage = nil
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 12))
                        Text("Back to catalog search")
                    }
                    .font(.sora(13, .medium))
                    .foregroundStyle(Color.rbAccentLight)
                }

                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.top, 24)
        }
    }

    private var headerSection: some View {
        VStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color.rbAccent)
                .frame(width: 72, height: 72)
                .overlay {
                    Image(systemName: "square.and.pencil")
                        .font(.system(size: 28, weight: .semibold))
                        .foregroundStyle(.white)
                }
                .shadow(color: Color.rbAccent.opacity(0.5), radius: 14, y: 8)

            Text("Enter the song details manually")
                .font(.sora(14))
                .foregroundStyle(Color.rbTextSecondary)
                .multilineTextAlignment(.center)
        }
    }

    private var formSection: some View {
        VStack(spacing: 16) {
            // Song Title
            formField(
                label: "Song Title",
                icon: "music.note"
            ) {
                TextField("Enter song title", text: $songTitle)
                    .textInputAutocapitalization(.words)
                    .focused($focusedField, equals: .songTitle)
                    .foregroundStyle(Color.rbTextPrimary)
            }

            // Artist Name (read-only)
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Image(systemName: "person.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(Color.rbTextTertiary)

                    Text("ARTIST NAME")
                        .font(.sora(10, .semibold))
                        .tracking(1.4)
                        .foregroundStyle(Color.rbTextTertiary)
                }

                HStack {
                    Text(artistName.isEmpty ? "Your Name" : artistName)
                        .font(.sora(14))
                        .foregroundStyle(Color.rbTextSecondary)

                    Spacer()

                    Image(systemName: "lock.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(Color.rbTextTertiary)
                }
                .padding(14)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.white.opacity(0.04))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(Color.rbGlassBorder.opacity(0.6), lineWidth: 1)
                )
            }

            // ISRC
            formField(
                label: "ISRC",
                icon: "barcode"
            ) {
                TextField("e.g. USUG12000497", text: $isrc)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .focused($focusedField, equals: .isrc)
                    .foregroundStyle(Color.rbTextPrimary)
            }

            Text("ISRC (International Standard Recording Code) uniquely identifies your recording.")
                .font(.sora(11))
                .foregroundStyle(Color.rbTextTertiary)
                .padding(.horizontal, 4)
        }
    }

    private func formField<Content: View>(
        label: String,
        icon: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 12))
                    .foregroundStyle(Color.rbTextTertiary)

                Text(label.uppercased())
                    .font(.sora(10, .semibold))
                    .tracking(1.4)
                    .foregroundStyle(Color.rbTextTertiary)
            }

            content()
                .font(.sora(14))
                .tint(Color.rbAccent)
                .padding(14)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.white.opacity(0.06))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(Color.rbGlassBorder, lineWidth: 1)
                )
        }
    }

    private var submitButton: some View {
        Button {
            Task { await addManualSong() }
        } label: {
            HStack(spacing: 10) {
                if isSubmitting {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 16, weight: .semibold))
                }
                Text("Add Song")
                    .font(.sora(16, .bold))
            }
            .foregroundStyle(isManualFormValid ? .white : Color.rbTextTertiary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background {
                if isManualFormValid {
                    LinearGradient.rbAccentGradient
                } else {
                    Color.white.opacity(0.06)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(Color.rbGlassBorder, lineWidth: isManualFormValid ? 0 : 1)
            )
            .shadow(color: Color.rbAccent.opacity(isManualFormValid ? 0.5 : 0), radius: 14, y: 8)
        }
        .disabled(!isManualFormValid || isSubmitting)
        .padding(.top, 8)
    }

    // MARK: - Actions

    private func performSearch() async {
        isSearching = true
        defer { isSearching = false }

        do {
            let tracks: [BrowseTrack] = try await APIClient.shared.request(
                .browseTracks(query: searchQuery.trimmingCharacters(in: .whitespaces))
            )
            results = tracks
        } catch is CancellationError {
            // A newer search superseded this one
        } catch {
            errorMessage = "Search failed. Check your connection and try again."
        }
    }

    private func addSelectedTrack(_ track: BrowseTrack) async {
        guard let isrc = track.isrc else { return }
        isSubmitting = true
        errorMessage = nil

        let success = await viewModel.addSong(
            title: track.title,
            artist: track.artist,
            isrc: isrc.uppercased()
        )

        isSubmitting = false

        if success {
            dismiss()
        } else {
            errorMessage = viewModel.error ?? "Failed to add song. Please try again."
        }
    }

    private func addManualSong() async {
        guard isManualFormValid else { return }
        isSubmitting = true
        errorMessage = nil

        let success = await viewModel.addSong(
            title: songTitle.trimmingCharacters(in: .whitespaces),
            artist: artistName.trimmingCharacters(in: .whitespaces),
            isrc: isrc.trimmingCharacters(in: .whitespaces).uppercased()
        )

        isSubmitting = false

        if success {
            dismiss()
        } else {
            errorMessage = viewModel.error ?? "Failed to add song. Please try again."
        }
    }
}

#Preview {
    AddSongSheet(viewModel: MonitoredSongsViewModel())
        .preferredColorScheme(.dark)
}
