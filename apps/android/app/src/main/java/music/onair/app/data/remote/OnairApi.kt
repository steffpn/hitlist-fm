package music.onair.app.data.remote

import music.onair.app.data.model.AddSongRequest
import music.onair.app.data.model.AddWatchedStationRequest
import music.onair.app.data.model.AirplayEvent
import music.onair.app.data.model.ArtistDashboardResponse
import music.onair.app.data.model.ArtistsSummaryItem
import music.onair.app.data.model.BrowseTrack
import music.onair.app.data.model.CheckoutResponse
import music.onair.app.data.model.CompetitorDetailResponse
import music.onair.app.data.model.CompetitorSummaryItem
import music.onair.app.data.model.CreateCheckoutRequest
import music.onair.app.data.model.DigestDetail
import music.onair.app.data.model.ForgotPasswordRequest
import music.onair.app.data.model.LabelArtistSong
import music.onair.app.data.model.LabelComparisonResponse
import music.onair.app.data.model.MessageResponse
import music.onair.app.data.model.OwnStationsResponse
import music.onair.app.data.model.PlaylistOverlapResponse
import music.onair.app.data.model.PreferencesSettingsPatch
import music.onair.app.data.model.PreferencesSettingsResponse
import music.onair.app.data.model.SubscriptionInfoResponse
import music.onair.app.data.model.AuthResponse
import music.onair.app.data.model.ConfigureImpersonationRequest
import music.onair.app.data.model.DashboardSummaryResponse
import music.onair.app.data.model.DeviceTokenRequest
import music.onair.app.data.model.SimpleSuccess
import music.onair.app.data.model.ImpersonationConfigResult
import music.onair.app.data.model.DiscoveryScoreResponse
import music.onair.app.data.model.ImpersonationOptions
import music.onair.app.data.model.LabelArtistItem
import music.onair.app.data.model.LabelDashboardResponse
import music.onair.app.data.model.LoginRequest
import music.onair.app.data.model.NewSongItem
import music.onair.app.data.model.RotationAnalysisResponse
import music.onair.app.data.model.SongAnalyticsResponse
import music.onair.app.data.model.SongHourlyHeatmapResponse
import music.onair.app.data.model.SongStationBreakdownItem
import music.onair.app.data.model.StationAffinityItem
import music.onair.app.data.model.LogoutRequest
import music.onair.app.data.model.MonitoredSong
import music.onair.app.data.model.LogoutResponse
import music.onair.app.data.model.PaginatedResponse
import music.onair.app.data.model.RefreshRequest
import music.onair.app.data.model.RegisterRequest
import music.onair.app.data.model.SnippetUrlResponse
import music.onair.app.data.model.Station
import music.onair.app.data.model.StationOverview
import music.onair.app.data.model.StationTopSong
import music.onair.app.data.model.TokenResponse
import music.onair.app.data.model.TopStationsResponse
import music.onair.app.data.model.WatchedStation
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/** Retrofit surface for the onair.music backend. Grows as screens are ported. */
interface OnairApi {

    // ---- Auth ----

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): AuthResponse

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): TokenResponse

    @POST("auth/logout")
    suspend fun logout(@Body body: LogoutRequest): LogoutResponse

    @POST("auth/forgot-password")
    suspend fun forgotPassword(@Body body: ForgotPasswordRequest): MessageResponse

    @DELETE("auth/account")
    suspend fun deleteAccount(): Response<Unit>

    // ---- Push device token ----

    @POST("notifications/device-token")
    suspend fun registerDeviceToken(@Body body: DeviceTokenRequest): SimpleSuccess

    @GET("notifications/digest/{date}")
    suspend fun getDigestDetail(
        @Path("date") date: String,
        @Query("type") type: String? = null, // "daily" | "weekly"
    ): DigestDetail

    // ---- Detections ----

    @GET("airplay-events")
    suspend fun getAirplayEvents(
        @Query("limit") limit: Int,
        @Query("cursor") cursor: Int? = null,
        @Query("q") query: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null,
        @Query("stationId") stationId: Int? = null,
    ): PaginatedResponse<AirplayEvent>

    @GET("stations")
    suspend fun getStations(): List<Station>

    @GET("airplay-events/{id}/snippet")
    suspend fun getSnippetUrl(@Path("id") id: Int): SnippetUrlResponse

    // ---- Artist ----

    @GET("artist/dashboard")
    suspend fun getArtistDashboard(): ArtistDashboardResponse

    @GET("artist/songs")
    suspend fun getArtistSongs(): List<MonitoredSong>

    @POST("artist/songs")
    suspend fun addArtistSong(@Body body: AddSongRequest): MonitoredSong

    @DELETE("artist/songs/{id}")
    suspend fun deleteArtistSong(@Path("id") id: Int): Response<Unit>

    @GET("artist/browse-tracks")
    suspend fun browseTracks(@Query("q") query: String): List<BrowseTrack>

    @GET("artist/songs/{id}/analytics")
    suspend fun getSongAnalytics(@Path("id") id: Int): SongAnalyticsResponse

    @GET("artist/songs/{id}/station-breakdown")
    suspend fun getSongStationBreakdown(@Path("id") id: Int): List<SongStationBreakdownItem>

    @GET("artist/songs/{id}/hourly-heatmap")
    suspend fun getSongHourlyHeatmap(@Path("id") id: Int): SongHourlyHeatmapResponse

    // ---- Station ----

    @GET("station/overview")
    suspend fun getStationOverview(@Query("period") period: String): StationOverview

    @GET("station/top-songs")
    suspend fun getStationTopSongs(
        @Query("period") period: String,
        @Query("limit") limit: Int = 20,
    ): List<StationTopSong>

    @GET("station/new-songs")
    suspend fun getStationNewSongs(): List<NewSongItem>

    @GET("station/discovery-score")
    suspend fun getDiscoveryScore(@Query("period") period: String): DiscoveryScoreResponse

    @GET("station/rotation")
    suspend fun getRotationAnalysis(@Query("period") period: String): RotationAnalysisResponse

    @GET("station/overlap/{competitorId}")
    suspend fun getPlaylistOverlap(
        @Path("competitorId") competitorId: Int,
        @Query("period") period: String,
    ): PlaylistOverlapResponse

    @GET("competitors/summary")
    suspend fun getCompetitorSummary(@Query("period") period: String): List<CompetitorSummaryItem>

    @GET("competitors/{stationId}/detail")
    suspend fun getCompetitorDetail(
        @Path("stationId") stationId: Int,
        @Query("period") period: String,
    ): CompetitorDetailResponse

    @GET("competitors/watched")
    suspend fun getWatchedStations(): List<WatchedStation>

    @GET("competitors/own")
    suspend fun getOwnStations(): OwnStationsResponse

    @POST("competitors/watched")
    suspend fun addWatchedStation(@Body body: AddWatchedStationRequest): WatchedStation

    @DELETE("competitors/watched/{stationId}")
    suspend fun removeWatchedStation(@Path("stationId") stationId: Int): Response<Unit>

    // ---- Label ----

    @GET("label/dashboard")
    suspend fun getLabelDashboard(): LabelDashboardResponse

    @GET("label/artists")
    suspend fun getLabelArtists(): List<LabelArtistItem>

    @GET("label/artists/{id}/songs")
    suspend fun getLabelArtistSongs(@Path("id") id: Int): List<LabelArtistSong>

    @GET("label/station-affinity")
    suspend fun getStationAffinity(): List<StationAffinityItem>

    @GET("label/comparison")
    suspend fun getLabelComparison(
        @Query("artistIds") artistIds: String,
        @Query("period") period: String,
    ): LabelComparisonResponse

    // ---- Admin: global artists aggregation ----

    @GET("artists/summary")
    suspend fun getArtistsSummary(
        @Query("period") period: String,
        @Query("limit") limit: Int = 100,
    ): List<ArtistsSummaryItem>

    // ---- Settings + billing ----

    @GET("settings")
    suspend fun getSettings(): PreferencesSettingsResponse

    @PATCH("settings")
    suspend fun updateSettings(@Body body: PreferencesSettingsPatch): PreferencesSettingsResponse

    @GET("billing/me")
    suspend fun getSubscription(): SubscriptionInfoResponse

    @POST("billing/checkout")
    suspend fun createCheckout(@Body body: CreateCheckoutRequest): CheckoutResponse

    // ---- Dashboard ----

    @GET("dashboard/summary")
    suspend fun getDashboardSummary(
        @Query("period") period: String,
    ): DashboardSummaryResponse

    @GET("dashboard/top-stations")
    suspend fun getTopStations(
        @Query("period") period: String,
        @Query("limit") limit: Int = 10,
    ): TopStationsResponse

    // ---- Admin: view-as-role impersonation ----

    @GET("admin/impersonation/options")
    suspend fun getImpersonationOptions(): ImpersonationOptions

    @POST("admin/impersonation/configure")
    suspend fun configureImpersonation(
        @Body body: ConfigureImpersonationRequest,
    ): ImpersonationConfigResult
}
