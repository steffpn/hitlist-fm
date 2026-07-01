package music.onair.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import music.onair.app.core.PushManager
import music.onair.app.core.PushNavigator

/** Receives FCM pushes + token refreshes (active only once Firebase is configured). */
class OnairMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        PushManager.sendToken(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        // Handle BOTH notification and data-only payloads: when the backend sends
        // data-only (or the app is in the foreground), we build the notification
        // from the data map instead of dropping the message.
        val data = message.data
        val title = message.notification?.title
            ?: data["title"]
            ?: "onair.music"
        val body = message.notification?.body
            ?: data["body"]
            ?: return // nothing displayable

        showNotification(
            title = title,
            body = body,
            type = data["type"],
            date = data["date"],
        )
    }

    private fun showNotification(title: String, body: String, type: String?, date: String?) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            createChannels(manager)
        }

        val tapIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            type?.let { putExtra(PushNavigator.EXTRA_TYPE, it) }
            date?.let { putExtra(PushNavigator.EXTRA_DATE, it) }
        }
        val contentIntent = PendingIntent.getActivity(
            this,
            (System.currentTimeMillis() % Int.MAX_VALUE).toInt(),
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val built = NotificationCompat.Builder(this, channelFor(type))
            .setSmallIcon(R.drawable.ic_stat_onair)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
        try {
            NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), built)
        } catch (_: SecurityException) {
            // POST_NOTIFICATIONS not granted
        }
    }

    private fun channelFor(type: String?): String = when (type) {
        "weekly_digest" -> CHANNEL_WEEKLY
        "chart_alert" -> CHANNEL_CHART_ALERTS
        else -> CHANNEL_DAILY // daily_digest + anything unknown
    }

    private fun createChannels(manager: NotificationManager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_DAILY, "Daily reports", NotificationManager.IMPORTANCE_DEFAULT),
        )
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_WEEKLY, "Weekly digests", NotificationManager.IMPORTANCE_DEFAULT),
        )
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_CHART_ALERTS, "Chart alerts", NotificationManager.IMPORTANCE_HIGH),
        )
    }

    private companion object {
        const val CHANNEL_DAILY = "daily_report"
        const val CHANNEL_WEEKLY = "weekly_digest"
        const val CHANNEL_CHART_ALERTS = "chart_alerts"
    }
}
