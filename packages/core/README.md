# @tealium/prism-react-native

Tealium Prism for React Native wraps the native Tealium Prism SDKs for iOS and Android. You call a typed TypeScript API, and the native SDKs run the tracking pipeline.

The package supports the New Architecture (TurboModules) only. The example app tests React Native 0.85.

## Installation

Install the package, then install the iOS pods:

```sh
npm install @tealium/prism-react-native
cd ios && pod install
```

## Usage

Create an instance, then track an event:

```ts
import { Tealium, Environment } from "@tealium/prism-react-native";

const tealium = Tealium.create("my_account", "my_profile", Environment.prod);

await tealium.track("user_login", "event", { customer_id: "1234567890" });
```

## Documentation

The following resources describe the full API:

- [README on GitHub](https://github.com/Tealium/tealium-prism-react-native#readme) covers optional packages, settings, log level, trace, and error handling.
- [API reference](https://tealium.github.io/tealium-prism-react-native/) lists every exported symbol.

## License

Commercial. See the [license](https://github.com/Tealium/tealium-prism-react-native/blob/main/LICENSE).
