package fm.hitlist.app.core

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import fm.hitlist.app.BuildConfig
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Request
import java.io.File

/**
 * Downloads the filtered detections CSV from GET /exports/csv (authenticated via
 * the shared OkHttp client) and shares it through ACTION_SEND + FileProvider.
 */
object CsvExporter {

    suspend fun exportAndShare(
        context: Context,
        query: String? = null,
        startDate: String? = null,
        endDate: String? = null,
        stationId: Int? = null,
    ) {
        val file = withContext(Dispatchers.IO) {
            val url = (BuildConfig.API_BASE_URL.trimEnd('/') + "/exports/csv")
                .toHttpUrl()
                .newBuilder()
                .apply {
                    query?.takeIf { it.isNotBlank() }?.let { addQueryParameter("q", it) }
                    startDate?.let { addQueryParameter("startDate", it) }
                    endDate?.let { addQueryParameter("endDate", it) }
                    stationId?.let { addQueryParameter("stationId", it.toString()) }
                }
                .build()

            val request = Request.Builder().url(url).get().build()
            ServiceLocator.httpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    throw IllegalStateException("Export failed (${response.code})")
                }
                val dir = File(context.cacheDir, "exports").apply { mkdirs() }
                val out = File(dir, "detections-${System.currentTimeMillis()}.csv")
                response.body?.byteStream()?.use { input ->
                    out.outputStream().use { input.copyTo(it) }
                } ?: throw IllegalStateException("Empty export response")
                out
            }
        }

        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file,
        )
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "text/csv"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(send, "Share detections CSV"))
    }
}
