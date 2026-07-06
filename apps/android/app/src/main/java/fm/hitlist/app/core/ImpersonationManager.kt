package fm.hitlist.app.core

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Admin "view as role": tracks the impersonated persona so the app renders that
 * role's UI and APIClient attaches X-Impersonate-User-Id to non-/admin requests.
 * `userId` is @Volatile for the OkHttp interceptor thread; role/displayName are
 * Compose state for the UI.
 */
class ImpersonationManager {
    @Volatile
    var userId: Int? = null
        private set

    var role by mutableStateOf<String?>(null)
        private set
    var displayName by mutableStateOf<String?>(null)
        private set

    val isActive: Boolean get() = role != null

    fun start(userId: Int, role: String, displayName: String) {
        this.userId = userId
        this.role = role
        this.displayName = displayName
    }

    fun stop() {
        userId = null
        role = null
        displayName = null
    }
}
