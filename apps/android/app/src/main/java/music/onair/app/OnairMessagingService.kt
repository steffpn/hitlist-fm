package music.onair.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import music.onair.app.core.PushManager

/** Receives FCM pushes + token refreshes (active only once Firebase is configured). */
class OnairMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        PushManager.sendToken(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val notification = message.notification ?: return
        showNotification(
            title = notification.title ?: "onair.music",
            body = notification.body.orEmpty(),
        )
    }

    private fun showNotification(title: String, body: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Airplay alerts", NotificationManager.IMPORTANCE_DEFAULT),
            )
        }
        val built = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
        try {
            NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), built)
        } catch (_: SecurityException) {
            // POST_NOTIFICATIONS not granted
        }
    }

    private companion object {
        const val CHANNEL_ID = "onair_push"
    }
}
