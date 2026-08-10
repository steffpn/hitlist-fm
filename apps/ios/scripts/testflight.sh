#!/usr/bin/env bash
#
# Build, sign and upload the hitlist.fm iOS app to TestFlight.
#
# Signing notes — the distribution certificate for team Y2AN2MU7W9 (MUZE Records SRL)
# is a *Cloud Managed* certificate: the private key lives on Apple's servers, so
# `codesign` cannot use it locally and `xcodebuild archive` cannot sign for
# distribution directly. Automatic signing during archive would fall back to a
# development profile, which Apple refuses to issue for a team with no registered
# devices. The working pipeline is therefore:
#
#   1. archive unsigned                    (no certificate needed)
#   2. ad-hoc sign with the entitlements   (so `-exportArchive` sees them; an
#                                           unsigned archive carries none and the
#                                           push entitlement would be dropped)
#   3. xcodebuild -exportArchive           (re-signs remotely with the cloud cert)
#   4. altool --validate-app / --upload-app
#
# Requirements:
#   - App Store Connect API key (.p8) in ~/.appstoreconnect/private_keys/
#   - ASC_KEY_ID and ASC_ISSUER_ID exported, or passed as env vars.
#
# Usage:
#   ASC_KEY_ID=XXXXXXXXXX ASC_ISSUER_ID=xxxxxxxx-.... ./apps/ios/scripts/testflight.sh
#   BUILD_NUMBER=42 ... ./apps/ios/scripts/testflight.sh     # override build number
#   SKIP_UPLOAD=1 ...    ./apps/ios/scripts/testflight.sh     # build + validate only
#
set -euo pipefail

IOS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_DIR="$IOS_DIR/onairMusic"
PROJECT="$PROJECT_DIR/onairMusic.xcodeproj"
SCHEME="onairMusic"
BUILD_DIR="${BUILD_DIR:-$IOS_DIR/.build}"
ARCHIVE="$BUILD_DIR/hitlist.xcarchive"
EXPORT_DIR="$BUILD_DIR/export"

# Build numbers must increase monotonically per marketing version. The commit count
# gives that for free and stays reproducible from any checkout.
BUILD_NUMBER="${BUILD_NUMBER:-$(git -C "$IOS_DIR" rev-list --count HEAD)}"

echo "==> hitlist.fm iOS → TestFlight (build $BUILD_NUMBER)"
rm -rf "$ARCHIVE" "$EXPORT_DIR"
mkdir -p "$BUILD_DIR"

# ---------------------------------------------------------------- 1. archive
echo "==> Archiving (unsigned)"
xcodebuild \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  archive

# ------------------------------------------------- 2. embed the entitlements
# Derived from the target's entitlements so this stays a single source of truth;
# only aps-environment is promoted to production, which is what an App Store
# provisioning profile grants.
DIST_ENT="$BUILD_DIR/Distribution.entitlements"
cp "$PROJECT_DIR/onairMusic.entitlements" "$DIST_ENT"
if plutil -extract aps-environment raw "$DIST_ENT" >/dev/null 2>&1; then
  plutil -replace aps-environment -string production "$DIST_ENT"
fi

echo "==> Ad-hoc signing archive payload with entitlements"
codesign --force --sign - --entitlements "$DIST_ENT" \
  "$ARCHIVE/Products/Applications/onairMusic.app"

# ----------------------------------------------------------------- 3. export
echo "==> Exporting signed IPA (cloud-managed distribution certificate)"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$IOS_DIR/ExportOptions.plist" \
  -allowProvisioningUpdates

IPA="$EXPORT_DIR/onairMusic.ipa"
echo "==> Built $IPA"
plutil -p "$EXPORT_DIR/DistributionSummary.plist" | sed -n '/entitlements/,/}/p'

# ------------------------------------------------------- 4. validate + upload
: "${ASC_KEY_ID:?set ASC_KEY_ID (App Store Connect API key id)}"
: "${ASC_ISSUER_ID:?set ASC_ISSUER_ID (App Store Connect issuer id)}"

echo "==> Validating with App Store Connect"
xcrun altool --validate-app -f "$IPA" -t ios \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"

if [[ -n "${SKIP_UPLOAD:-}" ]]; then
  echo "==> SKIP_UPLOAD set — stopping after validation"
  exit 0
fi

echo "==> Uploading to TestFlight"
xcrun altool --upload-app -f "$IPA" -t ios \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"

echo "==> Done. Build $BUILD_NUMBER is processing in App Store Connect."
