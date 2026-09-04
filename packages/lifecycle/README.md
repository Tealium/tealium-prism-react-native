# @tealium/prism-react-native-lifecycle

Optional [Tealium Prism](https://github.com/Tealium/tealium-prism-react-native) Lifecycle module for React Native. Tracks app launch/wake/sleep lifecycle events.

This package ships no JavaScript. Installing it links the native Prism Lifecycle module, which registers itself automatically — no app-side wiring is required. Lifecycle behaviour (auto-tracking, session timeout, which events are tracked, etc.) is controlled entirely by your Tealium settings (remote or local JSON), mirroring the native SDKs.

## Installation

```sh
yarn add @tealium/prism-react-native @tealium/prism-react-native-lifecycle
```

- **iOS** — run `pod install` in your app's `ios` directory. Pulls the `tealium-prism/Lifecycle` subspec.
- **Android** — no extra steps. Autolinking adds the `com.tealium.prism:prism-lifecycle` dependency, whose factory self-registers via manifest merge.
