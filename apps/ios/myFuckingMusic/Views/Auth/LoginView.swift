import SwiftUI

struct LoginView: View {
    @Environment(AuthViewModel.self) private var viewModel
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        ZStack {
            Color.rbBackground
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    Spacer(minLength: 40)

                    Image(systemName: "person.circle")
                        .font(.system(size: 48))
                        .foregroundStyle(Color.rbAccent)

                    Text("Welcome Back")
                        .font(.title2.bold())
                        .foregroundStyle(Color.rbTextPrimary)

                    Text("Log in to your account")
                        .font(.subheadline)
                        .foregroundStyle(Color.rbTextSecondary)

                    VStack(spacing: 16) {
                        TextField("Email", text: $email)
                            .keyboardType(.emailAddress)
                            .textContentType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .modifier(AuthFieldStyle())

                        SecureField("Password", text: $password)
                            .textContentType(.password)
                            .modifier(AuthFieldStyle())
                    }
                    .padding(.horizontal, 24)

                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                            .padding(.horizontal, 24)
                    }

                    Button {
                        loginWith(email: email, password: password)
                    } label: {
                        Group {
                            if viewModel.isSubmitting {
                                ProgressView().tint(.white)
                            } else {
                                Text("Log In")
                            }
                        }
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.rbAccent)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(viewModel.isSubmitting)
                    .padding(.horizontal, 24)

                    Spacer(minLength: 40)
                }
            }
        }
        .navigationTitle("Log In")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
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

/// Lightweight text field styling — single background, no overlay/clipShape stack.
private struct AuthFieldStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(12)
            .foregroundStyle(Color.rbTextPrimary)
            .background(Color.rbSurface, in: RoundedRectangle(cornerRadius: 10))
    }
}

#Preview {
    NavigationStack {
        LoginView()
            .environment(AuthViewModel())
    }
}
