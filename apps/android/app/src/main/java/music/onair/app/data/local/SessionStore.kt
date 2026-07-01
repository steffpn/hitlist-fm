package music.onair.app.data.local

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.serialization.json.Json
import music.onair.app.data.model.AuthUser

/**
 * Secure persistence for auth tokens + the signed-in user.
 * Android equivalent of the iOS KeychainHelper (Security.framework), backed by
 * EncryptedSharedPreferences (hardware-backed key on supported devices).
 */
class SessionStore(context: Context, private val json: Json) {

    private val prefs = EncryptedSharedPreferences.create(
        context,
        FILE_NAME,
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    var accessToken: String?
        get() = prefs.getString(KEY_ACCESS, null)
        set(value) = prefs.edit().apply { if (value == null) remove(KEY_ACCESS) else putString(KEY_ACCESS, value) }.apply()

    var refreshToken: String?
        get() = prefs.getString(KEY_REFRESH, null)
        set(value) = prefs.edit().apply { if (value == null) remove(KEY_REFRESH) else putString(KEY_REFRESH, value) }.apply()

    val user: AuthUser?
        get() = prefs.getString(KEY_USER, null)?.let {
            runCatching { json.decodeFromString(AuthUser.serializer(), it) }.getOrNull()
        }

    fun saveSession(accessToken: String, refreshToken: String, user: AuthUser) {
        prefs.edit()
            .putString(KEY_ACCESS, accessToken)
            .putString(KEY_REFRESH, refreshToken)
            .putString(KEY_USER, json.encodeToString(AuthUser.serializer(), user))
            .apply()
    }

    fun saveTokens(accessToken: String, refreshToken: String) {
        prefs.edit()
            .putString(KEY_ACCESS, accessToken)
            .putString(KEY_REFRESH, refreshToken)
            .apply()
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    private companion object {
        const val FILE_NAME = "onair_secure_session"
        const val KEY_ACCESS = "accessToken"
        const val KEY_REFRESH = "refreshToken"
        const val KEY_USER = "user"
    }
}
