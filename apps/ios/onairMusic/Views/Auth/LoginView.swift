import SwiftUI

struct LoginView: View {
    @Environment(AuthViewModel.self) private var viewModel
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false

    var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                Spacer(minLength: 48)

                // MARK: Brand
                VStack(spacing: 18) {
                    // Logo mark — 66x66 gradient rounded-square with waveform glyph
                    ZStack {
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .fill(LinearGradient.rbAccentGradient)
                            .frame(width: 66, height: 66)
                            .shadow(color: .black.opacity(0.5), radius: 12, y: 10)

                        Image(systemName: "waveform")
                            .font(.system(size: 30, weight: .semibold))
                            .foregroundStyle(.white)
                    }

                    // Wordmark: onair.music
                    (
                        Text("onair").foregroundStyle(Color.rbTextPrimary)
                        + Text(".").foregroundStyle(Color.rbAccent)
                        + Text("music").foregroundStyle(Color.rbTextTertiary)
                    )
                    .font(.sora(27, .bold))

                    Text("Know exactly where your music plays.")
                        .font(.sora(14))
                        .foregroundStyle(Color.rbTextSecondary)
                        .multilineTextAlignment(.center)
                }

                Spacer(minLength: 12)

                // MARK: Fields
                VStack(spacing: 16) {
                    AuthGlassField(label: "Email") {
                        TextField("you@label.com", text: $email)
                            .keyboardType(.emailAddress)
                            .textContentType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    }

                    AuthGlassField(label: "Password", trailing: {
                        Button {
                            showPassword.toggle()
                        } label: {
                            Image(systemName: showPassword ? "eye.slash" : "eye")
                                .font(.system(size: 15))
                                .foregroundStyle(Color.rbTextTertiary)
                        }
                    }) {
                        Group {
                            if showPassword {
                                TextField("Your password", text: $password)
                            } else {
                                SecureField("Your password", text: $password)
                            }
                        }
                        .textContentType(.password)
                    }

                    // Forgot password — right-aligned accent
                    HStack {
                        Spacer()
                        Text("Forgot password?")
                            .font(.sora(12))
                            .foregroundStyle(Color.rbAccent)
                    }
                }

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.sora(12))
                        .foregroundStyle(Color.rbError)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                // MARK: Primary CTA — full-width radius-14 gradient
                Button {
                    loginWith(email: email, password: password)
                } label: {
                    Group {
                        if viewModel.isSubmitting {
                            ProgressView().tint(.white)
                        } else {
                            Text("Log in")
                        }
                    }
                    .font(.sora(16, .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(LinearGradient.rbAccentGradient)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .shadow(color: Color.rbAccent.opacity(0.5), radius: 14, y: 8)
                }
                .disabled(viewModel.isSubmitting)

                // MARK: "or" divider
                HStack(spacing: 12) {
                    Rectangle().fill(Color.rbHairline).frame(height: 1)
                    Text("or")
                        .font(.sora(11))
                        .foregroundStyle(Color.rbTextTertiary)
                    Rectangle().fill(Color.rbHairline).frame(height: 1)
                }
                .padding(.vertical, 2)

                // MARK: Secondary — Continue with invite code
                NavigationLink {
                    InviteCodeView()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 13))
                        Text("Continue with invite code")
                    }
                    .font(.sora(15, .semibold))
                    .foregroundStyle(Color.rbAccentLight)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(Color.rbAccent.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(Color.rbAccent.opacity(0.4), lineWidth: 1)
                    )
                }

                Spacer(minLength: 20)

                // MARK: Footer
                NavigationLink {
                    RegisterView()
                } label: {
                    (
                        Text("New here? ").foregroundStyle(Color.rbTextSecondary)
                        + Text("Create account").foregroundStyle(Color.rbAccent)
                    )
                    .font(.sora(13, .medium))
                }

                Spacer(minLength: 32)
            }
            .padding(.horizontal, 26)
            .frame(maxWidth: .infinity)
        }
        .onairBrandGlow()
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .preferredColorScheme(.dark)
        .onAppear {
            viewModel.errorMessage = nil
        }
    }

    private func loginWith(email: String, password: String) {
        self.email = email
        self.password = password
        viewModel.email = email
        viewModel.password = password
        Task { await viewModel.login() }
    }
}

/// Glass input field with an uppercase micro-label and optional trailing accessory.
private struct AuthGlassField<Field: View, Trailing: View>: View {
    let label: String
    @ViewBuilder var trailing: () -> Trailing
    @ViewBuilder var field: () -> Field

    init(label: String,
         @ViewBuilder trailing: @escaping () -> Trailing = { EmptyView() },
         @ViewBuilder field: @escaping () -> Field) {
        self.label = label
        self.trailing = trailing
        self.field = field
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(label.uppercased())
                .font(.sora(10.5, .semibold))
                .tracking(1.4)
                .foregroundStyle(Color.rbTextTertiary)

            HStack(spacing: 10) {
                field()
                    .foregroundStyle(Color.rbTextPrimary)
                    .tint(Color.rbAccent)
                trailing()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.white.opacity(0.06))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Color.rbGlassBorder, lineWidth: 1)
            )
        }
    }
}

#Preview {
    NavigationStack {
        LoginView()
            .environment(AuthViewModel())
    }
}
