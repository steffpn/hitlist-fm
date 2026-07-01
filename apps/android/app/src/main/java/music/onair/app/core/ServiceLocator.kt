package music.onair.app.core

import android.content.Context
import kotlinx.serialization.json.Json
import music.onair.app.BuildConfig
import music.onair.app.data.local.SessionStore
import music.onair.app.data.remote.AuthInterceptor
import music.onair.app.data.remote.DeezerApi
import music.onair.app.data.remote.OnairApi
import music.onair.app.data.remote.TokenAuthenticator
import music.onair.app.data.repository.AuthRepository
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/**
 * Minimal manual DI. Initialized once from OnairApp.onCreate().
 * Kept deliberately simple; can migrate to Hilt if the graph grows.
 */
object ServiceLocator {

    lateinit var json: Json
        private set
    lateinit var sessionStore: SessionStore
        private set
    lateinit var api: OnairApi
        private set

    /** Authenticated OkHttp client — for raw downloads (e.g. CSV export). */
    lateinit var httpClient: OkHttpClient
        private set
    lateinit var deezerApi: DeezerApi
        private set
    lateinit var authRepository: AuthRepository
        private set
    lateinit var audioPlayer: AudioPlayerManager
        private set
    val impersonation = ImpersonationManager()

    fun init(context: Context) {
        val app = context.applicationContext
        json = buildJson()
        sessionStore = SessionStore(app, json)

        val contentType = "application/json".toMediaType()

        // Bare client used only for token refresh (no auth interceptor / authenticator → no recursion).
        val refreshClient = OkHttpClient.Builder()
            .addInterceptor(logging())
            .build()
        val refreshApi = buildRetrofit(refreshClient, contentType).create(OnairApi::class.java)

        val authedClient = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(sessionStore, impersonation))
            .addInterceptor(logging())
            .authenticator(TokenAuthenticator(sessionStore) { refreshApi })
            .build()
        httpClient = authedClient
        api = buildRetrofit(authedClient, contentType).create(OnairApi::class.java)

        // Deezer public API (no auth) for artwork/metadata.
        val deezerRetrofit = Retrofit.Builder()
            .baseUrl("https://api.deezer.com/")
            .client(OkHttpClient.Builder().build())
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
        deezerApi = deezerRetrofit.create(DeezerApi::class.java)

        authRepository = AuthRepository(api, sessionStore, json)
        audioPlayer = AudioPlayerManager(app, api)
    }

    private fun buildRetrofit(
        client: OkHttpClient,
        contentType: okhttp3.MediaType,
    ): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
        .client(client)
        .addConverterFactory(json.asConverterFactory(contentType))
        .build()

    private fun logging() = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC
        else HttpLoggingInterceptor.Level.NONE
    }

    // The backend (Fastify/TS) is camelCase throughout, so no naming strategy:
    // Kotlin camelCase properties map directly to the JSON keys.
    private fun buildJson() = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
    }
}
