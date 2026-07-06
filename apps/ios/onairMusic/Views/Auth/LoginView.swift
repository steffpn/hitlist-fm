import SwiftUI

struct LoginView: View {
    @Environment(AuthViewModel.self) private var viewModel
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var showForgotPassword = false

    var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                Spacer(minLength: 48)

                // MARK: Brand
                VStack(spacing: 18) {
                    // Logo mark — hitlist.fm rotation gauge
                    HitlistMark(size: 66)
                        .shadow(color: Color.rbAccent.opacity(0.30), radius: 16, y: 6)

                    // Wordmark: hitlist.fm
                    (
                        Text("hitlist").foregroundStyle(Color.rbTextPrimary)
                        + Text(".fm").foregroundStyle(Color.rbAccent)
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
                        Button {
                            showForgotPassword = true
                        } label: {
                            Text("Forgot password?")
                                .font(.sora(12))
                                .foregroundStyle(Color.rbAccent)
                        }
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
        .sheet(isPresented: $showForgotPassword) {
            ForgotPasswordSheet(prefillEmail: email)
                .presentationDetents([.medium])
        }
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

// MARK: - Forgot Password

/// Email-entry sheet backed by POST /auth/forgot-password.
/// The backend always answers with a generic 200 (no account enumeration),
/// so the confirmation copy is deliberately non-committal.
private struct ForgotPasswordSheet: View {
    let prefillEmail: String

    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var isSubmitting = false
    @State private var submitted = false
    @State private var errorMessage: String?

    private var isEmailPlausible: Bool {
        email.contains("@") && email.contains(".")
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                if submitted {
                    confirmationView
                } else {
                    formView
                }
                Spacer()
            }
            .padding(.horizontal, 26)
            .padding(.top, 24)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.rbBackground.ignoresSafeArea())
            .navigationTitle("Reset Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbarBackground(Color.rbBackground, for: .navigationBar)
            .preferredColorScheme(.dark)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(submitted ? "Done" : "Cancel") {
                        dismiss()
                    }
                    .foregroundStyle(Color.rbTextSecondary)
                }
            }
        }
        .onAppear {
            email = prefillEmail
        }
    }

    private var formView: some View {
        VStack(spacing: 18) {
            Text("Enter the email you signed up with and we'll send you reset instructions.")
                .font(.sora(13.5))
                .foregroundStyle(Color.rbTextSecondary)
                .multilineTextAlignment(.center)

            AuthGlassField(label: "Email") {
                TextField("you@label.com", text: $email)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.sora(12))
                    .foregroundStyle(Color.rbError)
                    .multilineTextAlignment(.center)
            }

            Button {
                Task { await submit() }
            } label: {
                Group {
                    if isSubmitting {
                        ProgressView().tint(.white)
                    } else {
                        Text("Send Reset Email")
                    }
                }
                .font(.sora(15, .bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(LinearGradient.rbAccentGradient)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .opacity(isEmailPlausible ? 1 : 0.5)
            }
            .disabled(!isEmailPlausible || isSubmitting)
        }
    }

    private var confirmationView: some View {
        VStack(spacing: 14) {
            Image(systemName: "envelope.badge.fill")
                .font(.system(size: 40))
                .foregroundStyle(Color.rbAccent)

            Text("Check your inbox")
                .font(.sora(18, .bold))
                .foregroundStyle(Color.rbTextPrimary)

            Text("If an account exists for \(email), you'll receive an email with reset instructions shortly.")
                .font(.sora(13.5))
                .foregroundStyle(Color.rbTextSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 20)
    }

    private func submit() async {
        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }

        do {
            let (_, response) = try await APIClient.shared.requestRaw(
                .forgotPassword(email: email.trimmingCharacters(in: .whitespaces))
            )
            if response.statusCode == 429 {
                errorMessage = "Too many attempts. Please try again later."
                return
            }
            // Backend always replies with a generic 200 — never confirm whether
            // the account exists.
            submitted = true
        } catch {
            errorMessage = "Couldn't reach the server. Check your connection and try again."
        }
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
