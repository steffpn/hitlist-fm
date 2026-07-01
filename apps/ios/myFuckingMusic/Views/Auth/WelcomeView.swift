import SwiftUI

/// Full-screen welcome splash shown on first launch.
/// Provides navigation to invite code entry or login.
struct WelcomeView: View {
    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Logo mark — gradient rounded-square with waveform glyph
            ZStack {
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .fill(LinearGradient.rbAccentGradient)
                    .frame(width: 96, height: 96)
                    .shadow(color: Color(hex: "7C5CF6").opacity(0.6), radius: 12, y: 10)

                Image(systemName: "waveform")
                    .font(.system(size: 44, weight: .semibold))
                    .foregroundStyle(.white)
            }

            // App title — onair.music
            VStack(spacing: 10) {
                (
                    Text("onair").foregroundStyle(Color.rbTextPrimary)
                    + Text(".").foregroundStyle(Color.rbAccent)
                    + Text("music").foregroundStyle(Color.rbTextTertiary)
                )
                .font(.sora(34, .bold))

                Text("Know exactly where your music plays.")
                    .font(.sora(14))
                    .foregroundStyle(Color.rbTextSecondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()

            // Navigation buttons
            VStack(spacing: 16) {
                NavigationLink {
                    InviteCodeView()
                } label: {
                    Text("I have an invite code")
                        .font(.sora(16, .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(LinearGradient.rbAccentGradient)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .shadow(color: Color.rbAccent.opacity(0.5), radius: 14, y: 8)
                }

                NavigationLink {
                    LoginView()
                } label: {
                    (
                        Text("Already have an account? ").foregroundStyle(Color.rbTextSecondary)
                        + Text("Log in").foregroundStyle(Color.rbAccent)
                    )
                    .font(.sora(14, .medium))
                }
            }
            .padding(.horizontal, 26)
            .padding(.bottom, 48)
        }
        .frame(maxWidth: .infinity)
        .onairGlow()
        .navigationBarBackButtonHidden(true)
        .preferredColorScheme(.dark)
    }
}

#Preview {
    NavigationStack {
        WelcomeView()
    }
}
