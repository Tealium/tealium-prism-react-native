# @tealium/prism-react-native

React Native wrapper for the Tealium Prism mobile SDKs

## Installation


```sh
npm install @tealium/prism-react-native
```


> **Status:** early scaffold (PR0). The TurboModule is wired and linkable on
> iOS and Android, but no Prism functionality is bridged yet. Prism APIs land in
> subsequent PRs.

## Usage


```js
import { isWrapperLoaded } from '@tealium/prism-react-native';

// Confirm the native wrapper module is linked on the current platform.
const loaded = isWrapperLoaded();
```

## License

Commercial

