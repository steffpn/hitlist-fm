package music.onair.app.core

import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** Formats backend ISO-8601 timestamps for display (java.time available on minSdk 26). */
object DateFormat {
    private val display = DateTimeFormatter.ofPattern("MMM d, HH:mm")
    private val dayMonthFmt = DateTimeFormatter.ofPattern("M/d")

    /** Short "M/d" label for chart x-axes. */
    fun dayMonth(iso: String?): String {
        if (iso.isNullOrBlank()) return ""
        return try {
            OffsetDateTime.parse(iso).atZoneSameInstant(ZoneId.systemDefault()).format(dayMonthFmt)
        } catch (_: Exception) {
            try {
                Instant.parse(iso).atZone(ZoneId.systemDefault()).format(dayMonthFmt)
            } catch (_: Exception) {
                ""
            }
        }
    }

    /** "m:ss" duration between two ISO timestamps, or "" if unparseable. */
    fun durationLabel(startIso: String?, endIso: String?): String {
        if (startIso.isNullOrBlank() || endIso.isNullOrBlank()) return ""
        return try {
            val start = OffsetDateTime.parse(startIso).toInstant()
            val end = OffsetDateTime.parse(endIso).toInstant()
            val seconds = (end.epochSecond - start.epochSecond).coerceAtLeast(0)
            "%d:%02d".format(seconds / 60, seconds % 60)
        } catch (_: Exception) {
            ""
        }
    }

    fun shortDateTime(iso: String?): String {
        if (iso.isNullOrBlank()) return ""
        return try {
            OffsetDateTime.parse(iso).atZoneSameInstant(ZoneId.systemDefault()).format(display)
        } catch (_: Exception) {
            try {
                Instant.parse(iso).atZone(ZoneId.systemDefault()).format(display)
            } catch (_: Exception) {
                iso
            }
        }
    }
}
