package music.onair.app.data.remote

import kotlinx.coroutines.runBlocking
import music.onair.app.data.local.SessionStore
import music.onair.app.data.model.RefreshRequest
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route

/**
 * On a 401, silently refreshes the access token and retries the request once
 * (mirrors the iOS APIClient 401-retry-with-refresh flow). Single-flight via a
 * lock so concurrent 401s trigger only one refresh.
 *
 * @param refreshApiProvider yields an OnairApi built on a client WITHOUT this
 *        authenticator (and without the auth interceptor), to avoid recursion.
 */
class TokenAuthenticator(
    private val session: SessionStore,
    private val refreshApiProvider: () -> OnairApi,
) : Authenticator {

    private val lock = Any()

    override fun authenticate(route: Route?, response: Response): Request? {
        // Give up after too many attempts to avoid infinite retry loops.
        if (responseCount(response) >= 2) return null

        val failedToken = response.request.header("Authorization")?.removePrefix("Bearer ")

        synchronized(lock) {
            val current = session.accessToken
            // Another thread already refreshed while we waited on the lock.
            if (current != null && current != failedToken) {
                return response.request.newBuilder()
                    .header("Authorization", "Bearer $current")
                    .build()
            }

            val refreshToken = session.refreshToken ?: return null

            val tokens = try {
                runBlocking { refreshApiProvider().refresh(RefreshRequest(refreshToken)) }
            } catch (e: Exception) {
                session.clear()
                return null
            }

            session.saveTokens(tokens.accessToken, tokens.refreshToken)
            return response.request.newBuilder()
                .header("Authorization", "Bearer ${tokens.accessToken}")
                .build()
        }
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}
