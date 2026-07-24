# @tealium/prism-react-native-js-transformer

Optional [Tealium Prism](https://github.com/Tealium/tealium-prism-react-native) JavaScript transformer for React Native. Lets you transform dispatches with JavaScript defined in your Tealium settings.

This package ships no JavaScript of its own. Installing it links the native Prism JavaScript transformer, which registers itself automatically — no app-side wiring is required. It works on both iOS and Android.

## The JavaScript engine

The transformer needs a JavaScript engine to run scripts. Both are bundled for you:

- **iOS** — the OS-provided **JavaScriptCore**.
- **Android** — the [Rhino](https://github.com/mozilla/rhino) engine, pulled in transitively by this package.

## Installation

```sh
yarn add @tealium/prism-react-native @tealium/prism-react-native-js-transformer
```

- **iOS** — run `pod install` in your app's `ios` directory. Pulls the `tealium-prism/JavaScriptTransformer` subspec.
- **Android** — no extra steps. Autolinking adds the `com.tealium.prism:prism-js-transformer-rhino` dependency, whose AAR transitively pulls the base transformer and the Rhino engine, and registers the transformer factory via manifest merge.
