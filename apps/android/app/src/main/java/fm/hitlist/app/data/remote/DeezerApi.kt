package fm.hitlist.app.data.remote

import fm.hitlist.app.data.model.DeezerSearchResponse
import retrofit2.http.GET
import retrofit2.http.Query

/** Deezer public search API for album artwork + track metadata (no auth). */
interface DeezerApi {
    @GET("search")
    suspend fun search(
        @Query("q") query: String,
        @Query("limit") limit: Int = 1,
    ): DeezerSearchResponse
}
