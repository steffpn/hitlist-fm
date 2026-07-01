import SwiftUI

struct RegisterView: View {
    @Environment(AuthViewModel.self) private var viewModel
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                // Header
                VStack(spacing: 16) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .fill(LinearGradient.rbAccentGradient)
                            .frame(width: 60, height: 60)
                            .shadow(color: Color(hex: "7C5CF6").opacity(0.6), radius: 12, y: 10)

                        Image(systemName: "person.badge.plus")
                            .font(.system(size: 26, weight: .semibold))
                            .foregroundStyle(.white)
                    }

                    Text("Create account")
                        .font(.sora(24, .bold))
                        .foregroundStyle(Color.rbTextPrimary)
                }
                .padding(.top, 24)

                VStack(spacing: 16) {
                    RegisterGlassField(label: "Name") {
                        TextField("Your name", text: $name)
                            .textContentType(.name)
                            .textInputAutocapitalization(.words)
                    }

                    RegisterGlassField(label: "Email") {
                        TextField("you@label.com", text: $email)
                            .keyboardType(.emailAddress)
                            .textContentType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    }

                    RegisterGlassField(label: "Password") {
                        SecureField("Min 8 characters", text: $password)
                            .textContentType(.newPassword)
                    }

                    RegisterGlassField(label: "Confirm password") {
                        SecureField("Re-enter password", text: $confirmPassword)
                            .textContentType(.newPassword)
                    }
                }

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.sora(12))
                        .foregroundStyle(Color.rbError)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button {
                    viewModel.name = name
                    viewModel.email = email
                    viewModel.password = password
                    viewModel.confirmPassword = confirmPassword
                    Task { await viewModel.register() }
                } label: {
                    Group {
                        if viewModel.isSubmitting {
                            ProgressView().tint(.white)
                        } else {
                            Text("Create account")
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
                .padding(.bottom, 48)
            }
            .padding(.horizontal, 26)
            .frame(maxWidth: .infinity)
        }
        .onairGlow()
        .navigationTitle("Register")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .preferredColorScheme(.dark)
    }
}

/// Glass input field with an uppercase micro-label.
private struct RegisterGlassField<Field: View>: View {
    let label: String
    @ViewBuilder var field: () -> Field

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(label.uppercased())
                .font(.sora(10.5, .semibold))
                .tracking(1.4)
                .foregroundStyle(Color.rbTextTertiary)

            field()
                .foregroundStyle(Color.rbTextPrimary)
                .tint(Color.rbAccent)
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
        RegisterView()
            .environment(AuthViewModel())
    }
}
