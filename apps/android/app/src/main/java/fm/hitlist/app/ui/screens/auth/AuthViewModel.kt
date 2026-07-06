package fm.hitlist.app.ui.screens.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import fm.hitlist.app.core.ServiceLocator
import fm.hitlist.app.data.model.AuthUser
import fm.hitlist.app.data.model.ForgotPasswordRequest
import fm.hitlist.app.data.repository.AuthRepository

sealed interface AuthUiState {
    data object Loading : AuthUiState
    data object LoggedOut : AuthUiState
    data class LoggedIn(val user: AuthUser) : AuthUiState
}

class AuthViewModel(private val repo: AuthRepository) : ViewModel() {

    var uiState by mutableStateOf<AuthUiState>(AuthUiState.Loading)
        private set

    var isSubmitting by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    init {
        viewModelScope.launch {
            val user = repo.restoreSession()
            uiState = if (user != null) AuthUiState.LoggedIn(user) else AuthUiState.LoggedOut
        }
    }

    fun login(email: String, password: String) {
        if (isSubmitting) return
        viewModelScope.launch {
            isSubmitting = true
            errorMessage = null
            try {
                val user = repo.login(email.trim(), password)
                uiState = AuthUiState.LoggedIn(user)
            } catch (e: Exception) {
                errorMessage = repo.humanMessage(e)
            } finally {
                isSubmitting = false
            }
        }
    }

    fun register(code: String, email: String, password: String, name: String) {
        if (isSubmitting) return
        viewModelScope.launch {
            isSubmitting = true
            errorMessage = null
            try {
                val user = repo.register(code.trim(), email.trim(), password, name.trim())
                uiState = AuthUiState.LoggedIn(user)
            } catch (e: Exception) {
                errorMessage = repo.humanMessage(e)
            } finally {
                isSubmitting = false
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            repo.logout()
            uiState = AuthUiState.LoggedOut
        }
    }

    fun clearError() {
        errorMessage = null
    }

    // ── Forgot password (POST /auth/forgot-password) ──

    var isSendingReset by mutableStateOf(false)
        private set

    /** Always the generic server message — never reveals whether the email exists. */
    var resetMessage by mutableStateOf<String?>(null)
        private set

    fun forgotPassword(email: String) {
        if (isSendingReset) return
        viewModelScope.launch {
            isSendingReset = true
            resetMessage = null
            try {
                ServiceLocator.api.forgotPassword(ForgotPasswordRequest(email = email.trim()))
            } catch (_: Exception) {
                // Deliberately swallowed: the flow always shows the same generic message
                // (rate limiting / network errors must not leak account existence).
            } finally {
                resetMessage =
                    "If an account exists for that email, a password reset link has been sent."
                isSendingReset = false
            }
        }
    }

    fun clearResetMessage() {
        resetMessage = null
    }
}
