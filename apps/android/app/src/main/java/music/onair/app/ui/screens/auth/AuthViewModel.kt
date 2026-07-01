package music.onair.app.ui.screens.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import music.onair.app.data.model.AuthUser
import music.onair.app.data.repository.AuthRepository

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
}
