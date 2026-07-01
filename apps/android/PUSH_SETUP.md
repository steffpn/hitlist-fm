# Android push (FCM) — activation steps

The code for Android push is **already written** (client + backend). Push stays
dormant until these one-time credentials are added — everything else (and the
whole app) builds and runs without them.

## 1. Firebase project (client — `google-services.json`)
1. Create a Firebase project at https://console.firebase.google.com (or reuse one).
2. Add an **Android app** for each applicationId:
   - `music.onair.app` (release)
   - `music.onair.app.debug` (debug builds — add as a second Android app)
3. Download `google-services.json` and place it at `apps/android/app/google-services.json`.
   - The Gradle build auto-detects the file and applies the `google-services`
     plugin (see the `if (project.file("google-services.json").exists())` block
     in `app/build.gradle.kts`). No other client change needed.

## 2. Backend service account (server — sending)
1. In the same Firebase project → Project settings → Service accounts →
   **Generate new private key** (a JSON file).
2. Provide it to the API via **one** env var:
   - `FCM_SERVICE_ACCOUNT_JSON` = the JSON contents (as a string), **or**
   - `FCM_SERVICE_ACCOUNT_PATH` = path to the JSON file.
   - Without it, `getFcmMessaging()` returns null and Android sends are skipped
     (APNs/iOS is unaffected).

## 3. Database migration (adds `device_tokens.platform`)
Run against the API database:
```
cd apps/api && pnpm install         # pulls firebase-admin
pnpm prisma migrate deploy          # applies 20260701_add_device_token_platform
# (or run the SQL in prisma/migrations/20260701_add_device_token_platform/migration.sql)
```
Existing iOS tokens default to `platform = 'ios'`; the Android client registers
with `platform = 'android'`.

## What the code already does
- **Client**: requests POST_NOTIFICATIONS (Android 13+), fetches the FCM token on
  login/refresh (`PushManager`, `OnairMessagingService`), and registers it via
  `POST /notifications/device-token { token, platform: "android" }`.
- **Backend**: `lib/push.ts#sendPush` routes each device token to APNs (iOS) or
  FCM (Android) by `platform`; the 3 workers (daily-report, digest, chart-alerts)
  use it. `lib/fcm.ts` lazily inits `firebase-admin` from the env above.
