#!/bin/bash
# Runs the core package's iOS unit tests (the podspec's "Tests" test_spec) through the example
# workspace. Requires `pod install` in example/ios first, which generates the test scheme.
# Run via: yarn test:ios [destination]
# The default destination omits the OS so it works with any local runtime; CI passes a pinned one.
set -euo pipefail

cd "$(dirname "$0")/.."

DESTINATION="${1:-platform=iOS Simulator,name=iPhone 17 Pro}"

xcodebuild test \
  -workspace example/ios/TealiumPrismReactNativeExample.xcworkspace \
  -scheme TealiumPrismReactNative-Unit-Tests \
  -destination "$DESTINATION"
