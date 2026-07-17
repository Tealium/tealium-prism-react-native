# @tealium/prism-react-native-extensions

Optional [Tealium Prism](https://github.com/Tealium/tealium-prism-react-native) transformers for React Native: **SetDataValues**, **Lowercase**, and **PersistDataValue**.

This package ships no JavaScript. Installing it links the native Prism Extensions module, which registers the transformer factories automatically — no app-side wiring is required. Which transformations run, and against which keys, is controlled by your Tealium settings (remote, local, or programmatic), exactly as on the native SDKs.

## Installation

```sh
yarn add @tealium/prism-react-native @tealium/prism-react-native-extensions
```

- **iOS** — run `pod install` in your app's `ios` directory. Pulls the `tealium-prism/Extensions` subspec.
- **Android** — no extra steps. Autolinking adds the `com.tealium.prism:prism-extensions` dependency, whose factories self-register via manifest merge.
