package fm.hitlist.app

import android.app.Application
import fm.hitlist.app.core.ServiceLocator

/** Application entry point. Initializes the dependency graph. */
class OnairApp : Application() {
    override fun onCreate() {
        super.onCreate()
        ServiceLocator.init(this)
    }
}
