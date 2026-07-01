import SwiftUI

struct InviteCodeView: View {
    @Environment(AuthViewModel.self) private var viewModel
    @State private var inviteCode = ""

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            // Logo mark — gradient rounded-square
            ZStack {
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(LinearGradient.rbAccentGradient)
                    .frame(width: 66, height: 66)
                    .shadow(color: Color(hex: "7C5CF6").opacity(0.6), radius: 12, y: 10)

                Image(systemName: "ticket.fill")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(.white)
            }

            VStack(spacing: 10) {
                Text("Enter invite code")
                    .font(.sora(24, .bold))
                    .foregroundStyle(Color.rbTextPrimary)

                Text("Enter the code you received to create your account")
                    .font(.sora(14))
                    .foregroundStyle(Color.rbTextSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            TextField("XXXX-XXXX-XXXX", text: $inviteCode)
                .font(.mono(20, .medium))
                .multilineTextAlignment(.center)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
                .tint(Color.rbAccent)
                .padding(.vertical, 16)
                .padding(.horizontal, 20)
                .foregroundStyle(Color.rbTextPrimary)
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color.white.opacity(0.06))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(Color.rbGlassBorder, lineWidth: 1)
                )
                .padding(.horizontal, 26)
                .onChange(of: inviteCode) { _, newValue in
                    viewModel.inviteCode = newValue.uppercased()
                }

            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.sora(12))
                    .foregroundStyle(Color.rbError)
            }

            Spacer()

            NavigationLink {
                RegisterView()
            } label: {
                Text("Continue")
                    .font(.sora(16, .bold))
                    .foregroundStyle(viewModel.isInviteCodeValid ? .white : Color.rbTextTertiary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(
                        Group {
                            if viewModel.isInviteCodeValid {
                                AnyView(LinearGradient.rbAccentGradient)
                            } else {
                                AnyView(Color.white.opacity(0.06))
                            }
                        }
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(Color.rbGlassBorder, lineWidth: viewModel.isInviteCodeValid ? 0 : 1)
                    )
                    .shadow(color: viewModel.isInviteCodeValid ? Color.rbAccent.opacity(0.5) : .clear,
                            radius: 14, y: 8)
            }
            .disabled(!viewModel.isInviteCodeValid)
            .padding(.horizontal, 26)
            .padding(.bottom, 48)
        }
        .frame(maxWidth: .infinity)
        .onairGlow()
        .navigationTitle("Invite Code")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .preferredColorScheme(.dark)
        .onAppear { inviteCode = viewModel.inviteCode }
    }
}

#Preview {
    NavigationStack {
        InviteCodeView()
            .environment(AuthViewModel())
    }
}
