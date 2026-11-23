This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Monorepo structure

This example app lives inside the `tealium-prism-react-native` monorepo:

```
tealium-prism-react-native/
├── packages/
│   └── core/          # @tealium/prism-react-native SDK package
└── example/           # this app
```

The root workspace is managed with Yarn 4. The example app depends on `@tealium/prism-react-native` via `workspace:*`, so it always runs against the local source in `packages/core` — no publishing or `yarn link` needed.

To install all dependencies (run from the **repo root**, not `example/`):

```sh
yarn install
```

# Firebase credentials

This repo is public: **never commit real Firebase config files.** To run the Firebase dispatcher with your own Firebase project, download the files from the Firebase console and put them here:

| Platform | File (git-ignored)                                                    |
| -------- | --------------------------------------------------------------------- |
| Android  | `example/android/app/google-services.json`                            |
| iOS      | `example/ios/TealiumPrismReactNativeExample/GoogleService-Info.plist` |

Both file names are git-ignored anywhere in the repo, and `scripts/check-firebase-credentials.sh` (run by the pre-commit hook and CI) fails if either one is tracked, even after `git add -f`. If one was ever pushed, untrack it with `git rm --cached <file>` and rotate the keys in the Firebase console: the public history already exposed them.

## Firebase settings

The default `mobile_settings.json` has no Firebase dispatcher, because iOS crashes without `GoogleService-Info.plist`. With the credentials in place, pick **Settings: Firebase** on the Instances screen and tap **Create** to load `example/shared/mobile_settings_firebase.json`. Shut down any instance with the same account/profile first, otherwise the existing instance is returned and the new settings are ignored. Enable Firebase in one instance only, because the Firebase SDK is shared.

| Tealium event                                              | Firebase call                                    |
| ---------------------------------------------------------- | ------------------------------------------------ |
| `test_event` (Instances screen)                            | `logevent("test_event")`                         |
| `purchase` with data `{"total": 19.99, "currency": "USD"}` | `logevent("purchase", {value, currency})`        |
| `home` tracked as a view                                   | `logevent("screen_view", {screen_name: "home"})` |
| `launch` (lifecycle, on Create)                            | `setuserid(tealium_visitor_id)`                  |
| `trace_demo_event` (Trace screen, after Join)              | `setuserproperty("trace_id", tealium_trace_id)`  |

`initiateconversionmeasurement` is not mapped because it is iOS-only.

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the `example/` directory:

```sh
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the `example/` directory, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, from the `example/ios` directory run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
