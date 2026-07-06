package fm.hitlist.app.data.model

import kotlinx.serialization.Serializable

// GET /settings — full UserSettings row (raw Prisma object, camelCase JSON).
// Fields defaulted/nullable defensively; extra fields (id/userId/timestamps) are ignored.
@Serializable
data class PreferencesSettingsResponse(
    val dailyReportEnabled: Boolean = true,
    val dailyReportTime: String = "08:00",
    val dailyReportTimezone: String = "Europe/Bucharest",
    val weeklyReportEnabled: Boolean = true,
    val chartAlertsEnabled: Boolean = true,
    val chartAlertCountries: List<String> = emptyList(),
)

// PATCH /settings — partial update. Null fields are omitted (Json explicitNulls = false),
// so each toggle sends only the field it changes.
@Serializable
data class PreferencesSettingsPatch(
    val dailyReportEnabled: Boolean? = null,
    val dailyReportTime: String? = null,
    val dailyReportTimezone: String? = null,
    val weeklyReportEnabled: Boolean? = null,
    val chartAlertsEnabled: Boolean? = null,
    val chartAlertCountries: List<String>? = null,
)
