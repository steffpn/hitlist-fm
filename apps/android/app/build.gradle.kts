plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

// ── Release signing credentials (Wave 0) ──
// The upload keystore is created in Wave 0 (which needs the Play Console account):
// generate the upload key, enable Play App Signing, then supply these four values
// via ~/.gradle/gradle.properties, a local (git-ignored) gradle.properties, or CI
// environment variables. Nothing secret is committed here — only the wiring.
// When the values are absent (local debug builds / CI without the keystore) the
// release build simply stays unsigned and still succeeds.
val releaseStoreFile = (findProperty("RELEASE_STORE_FILE") as String?) ?: System.getenv("RELEASE_STORE_FILE")
val releaseStorePassword = (findProperty("RELEASE_STORE_PASSWORD") as String?) ?: System.getenv("RELEASE_STORE_PASSWORD")
val releaseKeyAlias = (findProperty("RELEASE_KEY_ALIAS") as String?) ?: System.getenv("RELEASE_KEY_ALIAS")
val releaseKeyPassword = (findProperty("RELEASE_KEY_PASSWORD") as String?) ?: System.getenv("RELEASE_KEY_PASSWORD")
val hasReleaseSigning = releaseStoreFile != null && releaseStorePassword != null &&
    releaseKeyAlias != null && releaseKeyPassword != null

android {
    namespace = "fm.hitlist.app"
    // compileSdk/targetSdk 35 = Android 15, required by Play from Aug 2025 for updates.
    // NOTE: SDK Platform 35 must be installed locally/CI to build; the code is correct
    // regardless of whether it is installed in this environment.
    compileSdk = 35

    defaultConfig {
        applicationId = "fm.hitlist.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 4
        versionName = "1.0.2"

        // Same production backend the iOS app talks to.
        buildConfigField(
            "String",
            "API_BASE_URL",
            "\"https://api-production-94f67.up.railway.app/api/v1\""
        )
        vectorDrawables { useSupportLibrary = true }
    }

    // Release signing scaffold. The config is only created when all four credentials
    // are present, so debug builds and CI without the upload keystore keep building.
    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = file(releaseStoreFile!!)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
        }
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // Applied only when the upload keystore is configured (see Wave 0 note
            // above); otherwise the release APK is left unsigned rather than failing.
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.navigation.compose)

    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.retrofit)
    implementation(libs.retrofit.serialization)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.androidx.security.crypto)
    implementation(libs.coil.compose)
    implementation(libs.androidx.media3.exoplayer)
    implementation(libs.androidx.browser)

    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)

    debugImplementation(libs.androidx.ui.tooling)
}

// FCM push is optional. The google-services plugin (and thus a working
// FirebaseApp) only activates once a real google-services.json from your
// Firebase project is placed in apps/android/app/. Until then the build stays
// green and the FCM registration code no-ops gracefully.
// Wave 0: create the Firebase project and drop its google-services.json here to
// enable push. Leave this conditional apply as-is — no config change is needed.
if (project.file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}
