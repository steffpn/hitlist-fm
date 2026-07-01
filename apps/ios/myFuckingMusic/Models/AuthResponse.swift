import Foundation

/// Response from POST /auth/register and POST /auth/login
struct AuthResponse: Codable, Sendable {
    let user: AuthUser
    let accessToken: String
    let refreshToken: String
}

/// User data returned in auth responses.
/// Subset of the full User model -- only public fields.
struct AuthUser: Codable, Sendable {
    let id: Int
    let email: String
    let name: String
    let role: String
}

/// Response from POST /auth/refresh
struct TokenResponse: Codable, Sendable {
    let accessToken: String
    let refreshToken: String
}

/// Error response from backend
struct ErrorResponse: Codable, Sendable {
    let error: String
}

/// Response from POST /auth/logout
struct LogoutResponse: Codable, Sendable {
    let message: String
}

/// Response from GET /airplay-events/:id/snippet
struct SnippetUrlResponse: Codable, Sendable {
    let url: String
    let expiresIn: Int
}

/// A user as returned by GET /admin/users (admin-only).
/// Used by the admin "view as role" picker. Extra fields in the response
/// (scopes, timestamps) are ignored.
struct AdminUser: Codable, Sendable, Identifiable, Hashable {
    let id: Int
    let email: String
    let name: String
    let role: String
    let isActive: Bool
}

// MARK: - Admin "view as role" — dynamic entity selection

/// Options for the admin impersonation picker (GET /admin/impersonation/options).
struct ImpersonationOptions: Codable, Sendable {
    let artists: [ImpersonationArtist]
    let stations: [ImpersonationStation]
}

struct ImpersonationArtist: Codable, Sendable, Identifiable, Hashable {
    let name: String
    let plays: Int
    var id: String { name }
}

struct ImpersonationStation: Codable, Sendable, Identifiable, Hashable {
    let id: Int
    let name: String
}

/// Result of POST /admin/impersonation/configure — the persona to impersonate.
struct ImpersonationConfigResult: Codable, Sendable {
    let userId: Int
    let role: String
    let displayName: String
}
