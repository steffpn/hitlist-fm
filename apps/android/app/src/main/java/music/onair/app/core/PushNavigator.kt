package music.onair.app.core

import android.content.Intent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Bridges notification taps to Compose navigation. MainActivity parses the
 * launch/new intent and stores the destination; AppRoot observes and routes.
 */
object PushNavigator {

    const val EXTRA_TYPE = "push_type"
    const val EXTRA_DATE = "push_date"

    data class Destination(
        val type: String, // daily_digest | weekly_digest | chart_alert
        val date: String?,
    )

    var pending by mutableStateOf<Destination?>(null)
        private set

    /** Consumes push extras from an intent (returns true if it carried any). */
    fun handleIntent(intent: Intent?): Boolean {
        val type = intent?.getStringExtra(EXTRA_TYPE) ?: return false
        pending = Destination(type = type, date = intent.getStringExtra(EXTRA_DATE))
        // Clear so re-delivery (e.g. rotation recreating the activity) doesn't re-route.
        intent.removeExtra(EXTRA_TYPE)
        intent.removeExtra(EXTRA_DATE)
        return true
    }

    fun clear() {
        pending = null
    }
}
