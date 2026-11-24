# Changelog

## 0.2.0

The packages now wrap the Tealium Prism SDK 0.8.0 for iOS and Android. The JavaScript API is the same as in 0.1.0, so your app code needs no changes. For the changes in the native SDK, see the [Prism for Swift 0.8.0](https://github.com/Tealium/tealium-prism-swift/releases/tag/0.8.0) and [Prism for Kotlin 0.8.0](https://github.com/Tealium/tealium-prism-kotlin/releases/tag/0.8.0) release notes.

### Packages

| Package | Version | Native dependency |
| --- | --- | --- |
| `@tealium/prism-react-native` | 0.2.0 | `tealium-prism/Core` ~> 0.8 (iOS), `com.tealium.prism:prism-core:0.8.0` (Android) |
| `@tealium/prism-react-native-lifecycle` | 0.2.0 | `tealium-prism/Lifecycle` ~> 0.8, `com.tealium.prism:prism-lifecycle:0.8.0` |
| `@tealium/prism-react-native-extensions` | 0.2.0 | `tealium-prism/Extensions` ~> 0.8, `com.tealium.prism:prism-extensions:0.8.0` |
| `@tealium/prism-react-native-js-transformer` | 0.2.0 | `tealium-prism/JavaScriptTransformer` ~> 0.8, `com.tealium.prism:prism-js-transformer-rhino:0.8.0` |

The optional packages now require `@tealium/prism-react-native` 0.2.0. Upgrade all installed Tealium packages together.

### Fixed

- **iOS:** `@tealium/prism-react-native` now builds when the app's Podfile uses `use_frameworks!`, with static or dynamic linkage. Before, the build failed with `'TealiumPrismReactNative-Swift.h' file not found`.

## 0.1.0

First release of Tealium Prism for React Native. The packages wrap the Tealium Prism SDK 0.7.0 for iOS and Android: you call a typed TypeScript API, and the native SDKs run the tracking pipeline.

### Packages

| Package | Version | Native dependency |
| --- | --- | --- |
| `@tealium/prism-react-native` | 0.1.0 | `tealium-prism/Core` ~> 0.7 (iOS), `com.tealium.prism:prism-core:0.7.0` (Android) |
| `@tealium/prism-react-native-lifecycle` | 0.1.0 | `tealium-prism/Lifecycle` ~> 0.7, `com.tealium.prism:prism-lifecycle:0.7.0` |
| `@tealium/prism-react-native-extensions` | 0.1.0 | `tealium-prism/Extensions` ~> 0.7, `com.tealium.prism:prism-extensions:0.7.0` |
| `@tealium/prism-react-native-js-transformer` | 0.1.0 | `tealium-prism/JavaScriptTransformer` ~> 0.7, `com.tealium.prism:prism-js-transformer-rhino:0.7.0` |

### Added

- **Initialization:** `Tealium.create(account, profile, environment, settingsFile?, settingsUrl?, logLevel?)` creates an instance from a bundled local settings file, a remote settings URL, or both, and sets the native log level. Calling it again for the same account and profile returns the existing instance. Instances for different accounts or profiles can run side by side.
- **Tracking:** `track(name, type?, data?)` tracks an event or a view and resolves with a `TrackResult` that has a `status`, an `info` string, and the dispatch `payload`.
- **Event queue:** `flushEventQueue()` asks the SDK to send queued events now instead of waiting for a full batch.
- **Shutdown:** `shutdown()` stops an instance. Later calls on it reject with `INSTANCE_SHUT_DOWN`.
- **Data layer:** `tealium.dataLayer` provides `put`, `putAll`, `get`, `getAll`, `remove` for one key or several, and `clear`. Writes accept an optional `Expiry`: `"forever"`, `"session"`, `"untilRestart"`, or a `Date`.
- **Trace:** `tealium.trace` provides `join`, `leave`, and `forceEndOfVisit`.
- **Visitor ID:** `tealium.visitorId` provides `current`, `regenerate`, and `eraseLocalHistory`. `eraseLocalHistory` erases only the identity associations stored on the device. It doesn't change server-side visitor profiles.
- **Errors:** errors from the package and the native SDK are `TealiumError`s whose `code` is one of the `ErrorCode` values. They reject the returned Promise, except in `Tealium.create`, which throws `NATIVE_MODULE_NOT_REGISTERED` synchronously when the native module is missing. Invalid input rejects with a plain `Error` without a `code`: data that can't be serialized to JSON, such as a circular reference or a `BigInt`, and an invalid `Date` expiry.
- **SDK version:** `getSdkVersion()` resolves with the version of the native Prism SDK.
- **Optional packages:** install `@tealium/prism-react-native-lifecycle`, `@tealium/prism-react-native-extensions` (the SetDataValues, Lowercase, and PersistDataValue transformers), or `@tealium/prism-react-native-js-transformer` to add the matching native Prism module. Autolinking registers the module, and your Tealium settings configure it.

### Requirements

- Android API level 24 or later.
- iOS 15.1 or later.
- React Native 0.85 or later. The example app tests React Native 0.85.
- The New Architecture (TurboModules). The legacy architecture isn't supported.
