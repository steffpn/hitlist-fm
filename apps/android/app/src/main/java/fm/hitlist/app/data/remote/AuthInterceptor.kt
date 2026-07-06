package fm.hitlist.app.data.remote

import fm.hitlist.app.core.ImpersonationManager
import fm.hitlist.app.data.local.SessionStore
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Attaches the Bearer access token to outgoing requests (mirrors iOS APIClient),
 * plus the admin X-Impersonate-User-Id header on non-/admin routes when a
 * "view as role" session is active.
 */
class AuthInterceptor(
    private val session: SessionStore,
    private val impersonation: ImpersonationManager,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val builder = request.newBuilder()

        session.accessToken?.let { builder.header("Authorization", "Bearer $it") }

        val impId = impersonation.userId
        if (impId != null && !request.url.encodedPath.contains("/admin/")) {
            builder.header("X-Impersonate-User-Id", impId.toString())
        }

        return chain.proceed(builder.build())
    }
}
