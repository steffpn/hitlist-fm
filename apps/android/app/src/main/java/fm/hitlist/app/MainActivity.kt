package fm.hitlist.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import fm.hitlist.app.core.PushNavigator
import fm.hitlist.app.ui.AppRoot
import fm.hitlist.app.ui.theme.OnairTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        PushNavigator.handleIntent(intent)
        setContent {
            OnairTheme {
                AppRoot()
            }
        }
    }

    // launchMode="singleTop": notification taps while the app is open land here.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        PushNavigator.handleIntent(intent)
    }
}
