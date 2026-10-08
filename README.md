# @tealium/prism-react-native

## What it is

Tealium Prism is the Tealium SDK for iOS and Android. This package wraps the native Prism SDKs for React Native apps. You call a typed TypeScript API, and the native SDKs run the tracking pipeline. The wrapper adds no tracking logic of its own, so settings and behavior match the native platforms.

## Requirements

The package has the following requirements:

- React Native 0.85. This is the version that the example app tests.
- The New Architecture (TurboModules). The package does not support the legacy architecture.

## Installation

Install the core package with npm:

```sh
npm install @tealium/prism-react-native
```

Or install it with Yarn:

```sh
yarn add @tealium/prism-react-native
```

Add the optional packages that your app needs:

- `@tealium/prism-react-native-extensions` adds the SetDataValues, Lowercase, and PersistDataValue transformers.
- `@tealium/prism-react-native-js-transformer` transforms dispatches with JavaScript defined in your Tealium settings.
- `@tealium/prism-react-native-lifecycle` tracks app launch, wake, and sleep events.

The optional packages register themselves with the core package. Your Tealium settings decide which modules run.

Install the native iOS dependencies:

```sh
cd ios && pod install
```

Android needs no extra steps because autolinking adds the native dependencies.

To check the native Prism SDK version, call `getSdkVersion`:

```ts
import { getSdkVersion } from "@tealium/prism-react-native";

const version = await getSdkVersion();
```

## Initialize

Create a single instance when the app starts, and share it across your app. Pass the account, profile, and environment to `Tealium.create`:

```ts
import { Tealium, Environment } from "@tealium/prism-react-native";

const tealium = Tealium.create(
  "my_account",
  "my_profile",
  Environment.prod,
  "my_settings.json",
  "https://tags.tiqcdn.com/dle/my_account/my_profile/mobile_settings_prod.json"
);
```

The optional arguments after the environment configure the settings sources and logging:

- `settingsFile` is the name of a JSON settings file bundled with the app. Include the `.json` extension. On iOS, add the file to your app target so that it ships in the main bundle. On Android, put the file in `android/app/src/main/assets/`. These local settings have the lowest priority.
- `settingsUrl` is the URL of a remote JSON settings resource. Remote settings override local settings.
- `logLevel` sets the log verbosity of the native SDK. It overrides both settings sources.

If an instance already exists for the same account and profile, `Tealium.create` returns it and logs a warning. It ignores the other arguments in that case.

To shut down an instance, call `shutdown`. Calls on a shut-down instance reject with an error:

```ts
await tealium.shutdown();
```

## Track

Call `track` with an event name, an optional type, and optional data. The type is `"event"` by default. Use `"view"` for screen views:

```ts
// Track an event with the default type.
await tealium.track("homepage");

// Track an event with data.
await tealium.track("user_login", "event", { customer_id: "1234567890" });

// Track a view.
await tealium.track("homepage", "view");
```

The data must be a plain object with JSON-serializable values.

`track` returns a Promise with a result. The result has a `status` of `"accepted"` or `"dropped"`, an `info` string, and the dispatch `payload`:

```ts
const result = await tealium.track("user_login");
console.log(result.status, result.info, result.payload);
```

## Log level

Set the log level with the sixth argument of `Tealium.create`. The available levels are `"trace"`, `"debug"`, `"info"`, `"warn"`, `"error"`, and `"silent"`. The level applies to the native Prism SDK.

Pass `undefined` for the settings arguments that you do not use:

```ts
const tealium = Tealium.create(
  "my_account",
  "my_profile",
  Environment.dev,
  undefined,
  undefined,
  "debug"
);
```

## Trace

Join a trace to validate your data. The SDK adds the trace ID to every later dispatch. This continues until you leave the trace or the session expires. Your Tealium settings must configure the Trace module. Without it, these calls reject.

```ts
// Join a trace.
await tealium.trace.join("12345");

// Track an event. The dispatch payload contains the trace ID.
await tealium.track("trace_demo_event");

// End the current visit. This call rejects if no trace is joined.
const result = await tealium.trace.forceEndOfVisit();

// Leave the trace.
await tealium.trace.leave();
```

The trace stays active after `forceEndOfVisit` until you call `leave`.

## Error handling

`Tealium.create` throws synchronously only if the native module is missing. `track` also throws synchronously if `data` cannot be serialized to JSON, for example if it contains a `BigInt` or a circular reference. `track` does not validate the other values. It silently drops object properties whose values are functions, symbols, or `undefined`. All other failures reject the returned Promise. Errors from the package and the native module carry a `code` property, except the synchronous serialization error from `track`. Compare the `code` against `ErrorCode`:

```ts
import { ErrorCode, type TealiumError } from "@tealium/prism-react-native";

try {
  await tealium.track("checkout_started");
} catch (error) {
  if ((error as TealiumError).code === ErrorCode.INSTANCE_SHUT_DOWN) {
    // Create a new instance before you track again.
  }
}
```

The error codes are:

- `DATA_PARSE_ERROR`: A JSON string that crossed the bridge could not be parsed.
- `INSTANCE_NOT_FOUND`: The native module has no instance for the given instance ID.
- `INSTANCE_SHUT_DOWN`: The instance was shut down. Call `Tealium.create` to get a new instance.
- `NATIVE_MODULE_NOT_REGISTERED`: The native module is not available in the running app. Rebuild the native app after installing the package.
- `PRISM_NATIVE_ERROR`: The native Prism SDK reported a failure. The error message comes from the native SDK.
- `TEALIUM_CANCELLED`: The native operation completed without producing a result.

## Documentation

Read the API reference at [tealium.github.io/tealium-prism-react-native](https://tealium.github.io/tealium-prism-react-native/).

## License

Commercial. See the [license](https://github.com/Tealium/tealium-prism-react-native/blob/main/LICENSE).
