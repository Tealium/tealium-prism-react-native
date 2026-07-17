# @tealium/prism-react-native-js-transformer-rhino

The [Rhino](https://github.com/mozilla/rhino) JavaScript engine for the [Tealium Prism JavaScript transformer](../js-transformer) on **Android**.

The Prism JavaScript transformer does not bundle a JavaScript engine on Android, so this package supplies one. It is **Android-only** — on iOS the transformer uses the OS-provided JavaScriptCore, so this package has no effect there and can be omitted from iOS-only apps.

This package ships no JavaScript. Installing it links the native `com.tealium.prism:prism-js-transformer-rhino` artifact (which transitively pulls the base transformer and Rhino) and registers the Rhino transformer factory automatically via manifest merge.

## Installation

```sh
yarn add @tealium/prism-react-native @tealium/prism-react-native-js-transformer @tealium/prism-react-native-js-transformer-rhino
```

No app-side wiring is required on Android beyond installing the package.
