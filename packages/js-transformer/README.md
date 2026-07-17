# @tealium/prism-react-native-js-transformer

Optional [Tealium Prism](https://github.com/Tealium/tealium-prism-react-native) JavaScript transformer for React Native. Lets you transform dispatches with JavaScript defined in your Tealium settings.

This package ships no JavaScript of its own. Installing it links the native Prism JavaScript transformer, which registers itself automatically — no app-side wiring is required.

## The JavaScript engine

The transformer needs a JavaScript engine to run scripts:

- **iOS** — uses the OS-provided **JavaScriptCore**. Nothing else to add.
- **Android** — has **no** bundled engine. You must also install
  [`@tealium/prism-react-native-js-transformer-rhino`](../js-transformer-rhino), which provides the [Rhino](https://github.com/mozilla/rhino) engine. Without it, JavaScript transformations will not run on Android.

## Installation

```sh
# iOS + Android
yarn add @tealium/prism-react-native @tealium/prism-react-native-js-transformer
# Android engine (required for Android)
yarn add @tealium/prism-react-native-js-transformer-rhino
```

- **iOS** — run `pod install` in your app's `ios` directory. Pulls the `tealium-prism/JavaScriptTransformer` subspec.
- **Android** — no extra steps. Autolinking adds the `com.tealium.prism:prism-js-transformer` dependency (the transformer itself, which ships no manifest entries) plus, from the engine package, `com.tealium.prism:prism-js-transformer-rhino`, whose AAR registers the transformer factory via manifest merge.
