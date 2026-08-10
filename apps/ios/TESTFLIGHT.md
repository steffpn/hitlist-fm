# TestFlight — hitlist.fm iOS

Runbook for shipping the iOS app to TestFlight under the **new** Apple Developer
account. Everything under "Already done" is live in Apple's systems; the rest needs
an account holder / admin sitting in front of App Store Connect.

## Account & identifiers

| | |
|---|---|
| Team | `Y2AN2MU7W9` — MUZE Records SRL (Company) |
| Apple ID on the team | `irinapostolache@muzerecords.ro` |
| Bundle ID | `fm.hitlist.pro` |
| App name (App Store Connect) | `hitlist.fm` |
| Display name on device | `hitlist.fm` |
| Version / build | `1.0` (`1`) |
| Minimum iOS | 17.0 — iPhone + iPad |
| App Store Connect app id | `6800100493` |
| TestFlight internal group | `Internal` — `32d5212b-95c2-4172-8e94-cf3e9a414e2c` |
| ASC API key id | `VHY34S88TJ` |
| ASC API issuer id | `1cd45bc4-23d1-4163-b4d7-4aefa2dac1a4` |

The key id and issuer id are identifiers, not secrets — they are useless without
`~/.appstoreconnect/private_keys/AuthKey_VHY34S88TJ.p8`, which is **not** in the repo.

`fm.hitlist.app` could **not** be reused: it is already registered to the old
personal team `3H8V5R5YP3` (Stefan Panaite), and Apple bundle IDs are globally
unique. The iOS bundle ID is now `fm.hitlist.pro`. Android keeps `fm.hitlist.app` —
Google Play is a separate namespace, so there is no conflict.

## Already done

- **App ID `fm.hitlist.pro` registered** on team Y2AN2MU7W9, with the Push
  Notifications capability enabled.
- **Distribution certificate created** — `Apple Distribution: MUZE Records SRL
  (Y2AN2MU7W9)`, *Cloud Managed*, valid until 2027-08-10.
- **App Store provisioning profile created** — `iOS Team Store Provisioning
  Profile: fm.hitlist.pro`.
- **Signed IPA built and verified** at `apps/ios/.build/export/onairMusic.ipa`
  (arm64, 3.4 MB) with the correct entitlements:

  ```
  application-identifier         Y2AN2MU7W9.fm.hitlist.pro
  aps-environment                production
  beta-reports-active            true
  com.apple.developer.team-identifier  Y2AN2MU7W9
  get-task-allow                 false
  ```

- **Export compliance pre-answered** — `ITSAppUsesNonExemptEncryption = NO` is in
  the build, so TestFlight will not block the build on the encryption question.
- **Privacy manifest** (`PrivacyInfo.xcprivacy`) declares email, name, user ID and
  device ID, all linked-to-user, none used for tracking, plus the `CA92.1`
  required-reason for UserDefaults. No other permission-gated APIs are used, so no
  extra `NS*UsageDescription` keys are needed.
- **Free Apps Agreement signed** (active Jul 1 2026 – Jul 1 2027) and the **app
  record created** — `hitlist.fm`, SKU `HITLISTFM-IOS-001`, primary locale `en-US`.
- **Build 1.0 (1) uploaded to TestFlight** — validated with no errors.
- **Internal TestFlight group `Internal` created.**
- **Repeatable pipeline** at `apps/ios/scripts/testflight.sh`, plus a small
  App Store Connect API client at `apps/ios/scripts/asc.py` for everything the
  upload tool cannot do (build status, beta groups, "What to Test").

Shipping a new build is now one command:

```bash
ASC_KEY_ID=VHY34S88TJ ASC_ISSUER_ID=1cd45bc4-23d1-4163-b4d7-4aefa2dac1a4 \
  ./apps/ios/scripts/testflight.sh
```

### Internal testing — live

Group `Internal` (`32d5212b-95c2-4172-8e94-cf3e9a414e2c`) has
`hasAccessToAllBuilds: true`, so every build reaches it with no extra step.
Testers: `irinapostolache@muzerecords.ro` (Account Holder) and
`stef.bbc6534@gmail.com` (Developer role, visibility limited to this app). Test
Information (feedback email + description) is filled in — without it the API refuses
to invite anyone with *"Tester has no installable build"*.

An internal tester must already be a user on the App Store Connect team; adding a
bare email to an internal group fails with *"Tester(s) cannot be assigned"*. Note
that an API key cannot grant a role at or above its own — inviting a user as
`APP_MANAGER` is rejected, `DEVELOPER` works and is enough for TestFlight.

Note: `POST /v1/betaGroups/{id}/relationships/builds` consistently answers 404
*"There is no resource of type 'builds'"* for a build that reads back fine over
`GET`. Creating the group with `hasAccessToAllBuilds: true` sidesteps it — and the
attribute is rejected on `PATCH`, so it has to be set at creation time.

### External testing — submitted for review

Group `Public Beta` (`839f3035-9141-4464-9a07-6c91ab8dfd5f`), public link
**https://testflight.apple.com/join/W8tSH8c6**, no seat limit. Build 1.0 (1) is
attached and submitted — `betaReviewState: WAITING_FOR_REVIEW`. The link only
starts working once Beta App Review approves; approval is per *version*, so later
builds on 1.0 reach testers immediately.

Unlike internal groups, external groups take builds through
`POST /v1/betaGroups/{id}/relationships/builds` normally (204).

Beta App Review details are filled in: contact Irina Postolache,
`irinapostolache@muzerecords.ro`, `+40 752 242 981`, demo account
`demo-artist@hitlist.fm` / `Hitlist!Demo2026` (verified against production).

**No DNS work was needed.** Apple only requires the privacy policy to be reachable
at *some* URL, so Test Information points at the Railway domains for now:

| | |
|---|---|
| Privacy policy | `https://site-production-113a.up.railway.app/privacy` |
| Marketing | `https://music-monitor-production-ed14.up.railway.app` |

Swap both to `hitlist.fm` once DNS moves to Railway. Once set, Apple does **not**
allow these URLs to be removed, only replaced.

⚠️ The privacy page still opens with *"Template — review with legal counsel before
launch. This document is placeholder copy"*. It has to be replaced with a real
policy before App Store submission, and it is visible to the beta reviewer today.

## Other pending items

- **DSA trader compliance.** *Business* → *Complete Compliance Requirements*.
  Does not block TestFlight; it blocks public App Store distribution in the EU.
- **Paid Apps Agreement** — status `New`. Only needed before selling in-app
  subscriptions, and requires the legal-entity details to be filled in first.

## Push notifications (separate from TestFlight)

Push is entitled in the build but the backend is **not** configured — on Railway
(`hitlist.fm` → `api`) only `APNS_SIGNING_KEY_PATH` is set, and it does not point at
a real key. To make notifications work:

1. Developer portal → *Certificates, Identifiers & Profiles* → *Keys* → **+** →
   enable **Apple Push Notifications service (APNs)** → download the `.p8`.
2. Set on the `api` service:

   | Variable | Value |
   |---|---|
   | `APNS_SIGNING_KEY_PATH` | path to the mounted `.p8` |
   | `APNS_KEY_ID` | the new key's ID |
   | `APNS_TEAM_ID` | `Y2AN2MU7W9` |
   | `APNS_BUNDLE_ID` | `fm.hitlist.pro` |
   | `APNS_HOST` | `api.push.apple.com` |

`api.push.apple.com` (production) is correct for TestFlight builds — they are signed
with `aps-environment: production`.

## How the build pipeline works

The distribution certificate is *Cloud Managed*: its private key lives on Apple's
servers, so `codesign` cannot use it locally and `xcodebuild archive` cannot sign for
distribution. Automatic signing during archive falls back to a development profile,
which Apple refuses to issue for a team with no registered devices. The script works
around both:

1. archive **unsigned**;
2. **ad-hoc sign** the payload with the entitlements (an unsigned archive carries
   none, and `-exportArchive` would silently drop `aps-environment`);
3. `xcodebuild -exportArchive` re-signs remotely with the cloud certificate;
4. `altool --validate-app` then `--upload-app`.

The build number defaults to `git rev-list --count HEAD` so it always increases;
override with `BUILD_NUMBER=<n>`. `SKIP_UPLOAD=1` stops after validation.
