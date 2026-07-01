package music.onair.app.data.model

import kotlinx.serialization.Serializable

// Mirrors apps/ios/onairMusic/Models/AuthResponse.swift. The JSON is snake_case;
// the Json instance uses JsonNamingStrategy.SnakeCase so camelCase props map through.

@Serializable
data class AuthUser(
    val id: Int,
    val email: String,
    val name: String,
    val role: String,
)

@Serializable
data class AuthResponse(
    val user: AuthUser,
    val accessToken: String,
    val refreshToken: String,
)

@Serializable
data class TokenResponse(
    val accessToken: String,
    val refreshToken: String,
)

@Serializable
data class LogoutResponse(
    val message: String? = null,
)

@Serializable
data class ErrorResponse(
    val error: String,
)

// Request bodies
@Serializable
data class RegisterRequest(
    val code: String,
    val email: String,
    val password: String,
    val name: String,
)

@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
)

@Serializable
data class RefreshRequest(
    val refreshToken: String,
)

@Serializable
data class LogoutRequest(
    val refreshToken: String,
)

// POST /auth/forgot-password — always answers with a generic message.
@Serializable
data class ForgotPasswordRequest(
    val email: String,
)

@Serializable
data class MessageResponse(
    val message: String? = null,
)
