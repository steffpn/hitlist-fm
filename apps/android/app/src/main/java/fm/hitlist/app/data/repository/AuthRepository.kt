package fm.hitlist.app.data.repository

import kotlinx.serialization.json.Json
import fm.hitlist.app.data.local.SessionStore
import fm.hitlist.app.data.model.AuthUser
import fm.hitlist.app.data.model.ErrorResponse
import fm.hitlist.app.data.model.LoginRequest
import fm.hitlist.app.data.model.LogoutRequest
import fm.hitlist.app.data.model.RefreshRequest
import fm.hitlist.app.data.model.RegisterRequest
import fm.hitlist.app.data.remote.OnairApi
import retrofit2.HttpException
import java.io.IOException

/** Auth flows, ported from the iOS AuthManager. */
class AuthRepository(
    private val api: OnairApi,
    private val session: SessionStore,
    private val json: Json,
) {
    val storedUser: AuthUser? get() = session.user

    suspend fun login(email: String, password: String): AuthUser {
        val res = api.login(LoginRequest(email, password))
        session.saveSession(res.accessToken, res.refreshToken, res.user)
        return res.user
    }

    suspend fun register(code: String, email: String, password: String, name: String): AuthUser {
        val res = api.register(RegisterRequest(code, email, password, name))
        session.saveSession(res.accessToken, res.refreshToken, res.user)
        return res.user
    }

    /**
     * On cold start: if we have a refresh token AND a cached user, validate the
     * session by refreshing. Returns the user on success, null otherwise.
     */
    suspend fun restoreSession(): AuthUser? {
        val refreshToken = session.refreshToken ?: return null
        val user = session.user ?: run { session.clear(); return null }
        return try {
            val tokens = api.refresh(RefreshRequest(refreshToken))
            session.saveTokens(tokens.accessToken, tokens.refreshToken)
            user
        } catch (e: Exception) {
            session.clear()
            null
        }
    }

    suspend fun logout() {
        try {
            session.refreshToken?.let { api.logout(LogoutRequest(it)) }
        } catch (_: Exception) {
            // best-effort server logout
        }
        session.clear()
    }

    /** Maps exceptions to a user-facing message, extracting the API's {error} body. */
    fun humanMessage(e: Throwable): String = when (e) {
        is HttpException -> {
            val body = e.response()?.errorBody()?.string()
            val parsed = body?.let {
                runCatching { json.decodeFromString(ErrorResponse.serializer(), it).error }.getOrNull()
            }
            parsed ?: "Something went wrong (${e.code()})"
        }
        is IOException -> "No connection. Check your internet and try again."
        else -> e.message ?: "Unexpected error"
    }
}
