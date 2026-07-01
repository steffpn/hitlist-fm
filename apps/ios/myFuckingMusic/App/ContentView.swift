import SwiftUI

/// Auth-gated root view.
/// Shows MainTabView when authenticated, auth flow when not.
struct ContentView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(ImpersonationManager.self) private var impersonation
    @State private var authViewModel = AuthViewModel()

    var body: some View {
        Group {
            if authManager.isLoading {
                // Loading state while checking stored tokens
                VStack(spacing: 16) {
                    ProgressView()
                    Text("Loading...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            } else if authManager.isAuthenticated {
                MainTabView()
            } else {
                NavigationStack {
                    WelcomeView()
                }
                .environment(authViewModel)
            }
        }
        .task {
            // Configure view model with auth manager
            authViewModel.configure(authManager: authManager)

            // Check stored tokens on app launch
            await authManager.checkStoredTokens()
        }
        .onChange(of: authManager.currentUser?.id) {
            // Reset any "view as" session whenever the real user changes
            // (login / logout) so impersonation never leaks across accounts.
            impersonation.stop()
        }
    }
}

#Preview {
    ContentView()
        .environment(AuthManager())
        .environment(ImpersonationManager())
}
