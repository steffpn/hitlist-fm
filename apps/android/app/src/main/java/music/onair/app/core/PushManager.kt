package music.onair.app.core

import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import music.onair.app.data.model.DeviceTokenRequest

/**
 * FCM token registration (Android push). Fully gated: if Firebase is not
 * configured (no google-services.json yet), FirebaseMessaging.getInstance()
 * throws and we no-op. Registers the token with the backend only when signed in.
 */
object PushManager {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    fun registerToken() {
        val messaging = try {
            FirebaseMessaging.getInstance()
        } catch (e: Throwable) {
            return // Firebase not configured — Android push disabled.
        }
        messaging.token.addOnCompleteListener { task ->
            if (task.isSuccessful) task.result?.let { sendToken(it) }
        }
    }

    fun sendToken(token: String) {
        val hasSession = try {
            ServiceLocator.sessionStore.accessToken != null
        } catch (e: Throwable) {
            false
        }
        if (!hasSession) return
        scope.launch {
            try {
                ServiceLocator.api.registerDeviceToken(DeviceTokenRequest(token = token))
            } catch (_: Exception) {
                // best-effort
            }
        }
    }
}
