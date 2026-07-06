import SwiftUI

/// Full-screen welcome splash shown on first launch.
/// Provides navigation to invite code entry or login.
struct WelcomeView: View {
    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Logo mark — hitlist.fm rotation gauge
            HitlistMark(size: 96)
                .shadow(color: Color.rbAccent.opacity(0.30), radius: 20, y: 8)

            // App title — hitlist.fm
            VStack(spacing: 10) {
                (
                    Text("hitlist").foregroundStyle(Color.rbTextPrimary)
                    + Text(".fm").foregroundStyle(Color.rbAccent)
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
        .onairBrandGlow()
        .navigationBarBackButtonHidden(true)
        .preferredColorScheme(.dark)
    }
}

#Preview {
    NavigationStack {
        WelcomeView()
    }
}
