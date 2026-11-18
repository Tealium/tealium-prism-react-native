# @tealium/prism-react-native-firebase

Optional [Tealium Prism](https://github.com/Tealium/tealium-prism-react-native) Firebase dispatcher for React Native. Sends Tealium events to Firebase Analytics.

This package ships no JavaScript. Installing it links the native Prism Firebase dispatcher, which registers itself automatically — no app-side wiring is required. The dispatcher is configured entirely through your Tealium settings (remote or local JSON) via a `FirebaseDispatcher` module entry, mirroring the native SDKs.

> [!IMPORTANT]
> Enable `FirebaseDispatcher` in only one Tealium instance. Firebase Analytics has a single shared instance, so every Tealium instance that enables it writes to the same Firebase instance.

## Installation

```sh
yarn add @tealium/prism-react-native @tealium/prism-react-native-firebase
```

- **iOS** — run `pod install` in your app's `ios` directory. Pulls the `TealiumPrismFirebase` pod (Firebase/Analytics 12.x). With React Native's default static libraries, add `pod 'GoogleUtilities', :modular_headers => true` to your app's `Podfile` (not needed with `use_frameworks! :linkage => :static`). Add `GoogleService-Info.plist` to your app target — if the module is enabled without it, Firebase raises an exception and the app crashes.
- **Android** — autolinking adds the `com.tealium.prism:firebase` dependency, whose factory self-registers via manifest merge. Apply the Google Services Gradle plugin (`com.google.gms.google-services`) and add `google-services.json` to your app module — without it Firebase Analytics stays disabled (logs `Missing google_app_id`).
