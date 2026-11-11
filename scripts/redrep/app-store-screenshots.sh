#!/usr/bin/env bash
# The App Store screenshots of Redrep, made on this Mac's simulators:
#   iphone/   the iPhone app on a 6.9" iPhone (1320x2868), started from the demo's example history
#             (a VITE_SCREENSHOTS=1 phone build), walked by AppUITests/RedrepScreenshots.swift
#   watch/    the Apple Watch app's own demo screens (-OpenGymWatchDemo) on a 46 mm watch (416x496)
#   widgets/  the Home Screen and Lock Screen widgets as the app draws them (-OpenGymWidgetPreview)
# into assets/app-store/ (OUT= to change it). Needs Xcode with the iOS and watchOS simulators,
# Node 22 and CocoaPods. The project is left as it was found: the UI test target is added for the
# run only, and the phone build is made again without the example data at the end.
#
#   scripts/redrep/app-store-screenshots.sh
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
FRONT="$ROOT/frontend"
IOS="$FRONT/ios/App"
OUT=${OUT:-"$ROOT/assets/app-store"}
IPHONE=${IPHONE:-"iPhone 16 Pro Max"}
WATCH=${WATCH:-"Apple Watch Series 11 (46mm)"}
DD=${DD:-"${TMPDIR:-/tmp}/redrep-shots-dd"}
APP_ID=com.riadheydar.redrep
WATCH_ID=$APP_ID.watchkitapp

# The Ruby that has the xcodeproj gem: CocoaPods' own (Homebrew's `pod` is a wrapper naming it).
POD=$(command -v pod)
export GEM_HOME=${GEM_HOME:-$(sed -n 's/^GEM_HOME="\([^"]*\)".*/\1/p' "$POD")}
RUBY=$(head -1 "$GEM_HOME/bin/pod" 2>/dev/null | sed 's/^#!//; s/ .*//')
[ -x "$RUBY" ] || RUBY=ruby

udid() { xcrun simctl list devices available -j | NAME="$1" node -e '
  const d = JSON.parse(require("fs").readFileSync(0)).devices
  const hit = Object.values(d).flat().filter(x => x.name === process.env.NAME).pop()
  process.stdout.write(hit ? hit.udid : "")'; }

PHONE=$(udid "$IPHONE"); [ -n "$PHONE" ] || { echo "no simulator named $IPHONE" >&2; exit 1; }
WRIST=$(udid "$WATCH")

PROJ="$IOS/App.xcodeproj/project.pbxproj"
cp "$PROJ" "$DD.pbxproj.bak" 2>/dev/null || { mkdir -p "$(dirname "$DD")"; cp "$PROJ" "$DD.pbxproj.bak"; }
restore() {
  cp "$DD.pbxproj.bak" "$PROJ"
  rm -f "$IOS/App.xcodeproj/xcshareddata/xcschemes/AppUITests.xcscheme"
  echo "rebuilding the phone app without the example data"
  (cd "$FRONT" && npm run build:mobile >/dev/null)
}
trap restore EXIT

rm -rf "$OUT/iphone" "$OUT/watch" "$OUT/widgets"
mkdir -p "$OUT/iphone" "$OUT/watch" "$OUT/widgets"

echo "phone build with the example history"
(cd "$FRONT" && VITE_SCREENSHOTS=1 npm run build:mobile >/dev/null)
(cd "$FRONT" && "$RUBY" ios/ci/add-ui-tests.rb)

xcrun simctl boot "$PHONE" 2>/dev/null || true
xcrun simctl bootstatus "$PHONE" -b >/dev/null
xcrun simctl uninstall "$PHONE" "$APP_ID" 2>/dev/null || true
xcrun simctl ui "$PHONE" appearance dark
xcrun simctl status_bar "$PHONE" override --time 9:41 --dataNetwork wifi --wifiMode active --wifiBars 3 \
  --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100

echo "iPhone screenshots on $IPHONE"
(cd "$IOS" && TEST_RUNNER_REDREP_SHOTS_DIR="$OUT/iphone" xcodebuild test -workspace App.xcworkspace -scheme AppUITests \
  -destination "id=$PHONE" -derivedDataPath "$DD" -only-testing:AppUITests/RedrepScreenshots \
  CODE_SIGNING_ALLOWED=NO 2>&1 | grep -E "error:|Test Case|TEST (SUCCEEDED|FAILED)" || true)

echo "widgets"
xcrun simctl terminate "$PHONE" "$APP_ID" 2>/dev/null || true
xcrun simctl launch "$PHONE" "$APP_ID" -OpenGymWidgetPreview >/dev/null
DATA=$(xcrun simctl get_app_container "$PHONE" "$APP_ID" data)
for _ in $(seq 60); do [ -f "$DATA/Documents/widget-preview/done.txt" ] && break; sleep 2; done
cp "$DATA"/Documents/widget-preview/*.png "$OUT/widgets/" 2>/dev/null || echo "no widget pictures were drawn" >&2
xcrun simctl terminate "$PHONE" "$APP_ID" 2>/dev/null || true

if [ -n "$WRIST" ]; then
  echo "Watch screenshots on $WATCH"
  WAPP="$DD/Build/Products/Debug-watchsimulator/OpenGymWatch.app"
  xcrun simctl boot "$WRIST" 2>/dev/null || true
  xcrun simctl bootstatus "$WRIST" -b >/dev/null
  xcrun simctl install "$WRIST" "$WAPP"
  for screen in idle set rest hold superset summary; do
    xcrun simctl terminate "$WRIST" "$WATCH_ID" 2>/dev/null || true
    xcrun simctl launch "$WRIST" "$WATCH_ID" -OpenGymWatchDemo -OpenGymWatchScreen "$screen" >/dev/null
    sleep 6
    xcrun simctl io "$WRIST" screenshot "$OUT/watch/$screen.png" >/dev/null
  done
  xcrun simctl terminate "$WRIST" "$WATCH_ID" 2>/dev/null || true
else
  echo "no simulator named $WATCH: no Watch screenshots" >&2
fi

[ -n "${KEEP_BUTTONS:-}" ] || rm -f "$OUT"/iphone/*.buttons.txt
echo "screenshots in $OUT"
