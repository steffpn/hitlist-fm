import SwiftUI

/// Sheet for adding a new song to the artist's monitored list.
/// Artist name is pre-filled and non-editable since artists can only add their own songs.
struct AddSongSheet: View {
    let viewModel: MonitoredSongsViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var songTitle = ""
    @State private var artistName = ""
    @State private var isrc = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    @FocusState private var focusedField: Field?

    private enum Field: Hashable {
        case songTitle
        case isrc
    }

    private var isFormValid: Bool {
        !songTitle.trimmingCharacters(in: .whitespaces).isEmpty
            && !isrc.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            ZStack {
                ScrollView {
                    VStack(spacing: 24) {
                        // Header icon
                        headerSection

                        // Form fields
                        formSection

                        // Error message
                        if let errorMessage {
                            Text(errorMessage)
                                .font(.sora(12))
                                .foregroundStyle(Color.rbError)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        }

                        // Submit button
                        submitButton

                        Spacer()
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 24)
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

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(LinearGradient.rbAccentGradient)
                .frame(width: 72, height: 72)
                .overlay {
                    Image(systemName: "plus")
                        .font(.system(size: 30, weight: .semibold))
                        .foregroundStyle(.white)
                }
                .shadow(color: Color.rbAccent.opacity(0.5), radius: 14, y: 8)

            Text("Track a new song across radio stations")
                .font(.sora(14))
                .foregroundStyle(Color.rbTextSecondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Form Section

    private var formSection: some View {
        VStack(spacing: 16) {
            // Song Title
            formField(
                label: "Song Title",
                icon: "music.note",
                placeholder: "Enter song title"
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
                icon: "barcode",
                placeholder: "e.g. USUG12000497"
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
        placeholder: String,
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

    // MARK: - Submit Button

    private var submitButton: some View {
        Button {
            Task { await addSong() }
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
            .foregroundStyle(isFormValid ? .white : Color.rbTextTertiary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background {
                if isFormValid {
                    LinearGradient.rbAccentGradient
                } else {
                    Color.white.opacity(0.06)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(Color.rbGlassBorder, lineWidth: isFormValid ? 0 : 1)
            )
            .shadow(color: Color.rbAccent.opacity(isFormValid ? 0.5 : 0), radius: 14, y: 8)
        }
        .disabled(!isFormValid || isSubmitting)
        .padding(.top, 8)
    }

    // MARK: - Actions

    private func addSong() async {
        guard isFormValid else { return }
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
