# Tealium Prism React Native – Example

Example app for the Tealium Prism React Native SDK.

## Requirements

- **Node.js** ≥ 20
- **Yarn** 4.x (used in this repo)
- **Android**: Android Studio, SDK 35, emulator or device
- **iOS**: Xcode, CocoaPods, simulator or device

## Running from the repo root

Run all commands from the **root directory** `tealium-prism-react-native` (not from `example/`).

### 1. Install dependencies

```bash
yarn
```

### 2. Build the library

```bash
yarn prepare
```

(or `yarn bob build` – creates the `lib/` directory with the module).

### 3. Start Metro (in one terminal)

```bash
yarn example start
```

Keep this terminal open.

### 4a. Android (in a second terminal)

```bash
yarn example android
```

Or from the root directory:

```bash
cd example && yarn android
```

**Note:** The first Android build may take a few minutes (Gradle, downloading the Prism SDK from Maven).

### 4b. iOS (in a second terminal)

First install pods for the example:

```bash
cd example/ios && pod install && cd ../..
```

Then run the app:

```bash
yarn example ios
```

Or:

```bash
cd example && yarn ios
```

## Quick testing (Android)

From the root directory, in one session:

```bash
yarn && yarn prepare && yarn example start
```

In a second terminal:

```bash
cd /Users/sebastian/Projects/tealium-prism-react-native && yarn example android
```

## What to test in the app

1. **Status** – after launch it should show "Initialized".
2. **Tracking** – TRACK VIEW, TRACK EVENT – check logs (e.g. `adb logcat | grep -i tealium` on Android).
3. **Data Layer** – ADD DATA (key + value), GET DATA – verify the stored value is returned.
4. **Visitor** – GET VISITOR ID, RESET VISITOR ID – verify an ID is returned.
5. **Trace** – enter a trace ID, JOIN TRACE – for debugging in Tealium Event Stream.

## Logs (Android)

```bash
adb logcat | grep -E "TealiumPrismRN|Tealium"
```

