# Tealium Prism React Native

React Native wrapper for the Tealium Prism mobile SDKs (iOS and Android).

Provides a unified TypeScript API for event tracking, data layer management, consent handling, and visitor identity management.

## Features

- **Initialization** - Promise-based SDK setup with configuration options
- **Event Tracking** - Track views and events with custom data payloads
- **Data Layer** - Persistent key-value storage with expiry options
- **Trace** - Debug mode for real-time event monitoring
- **Visitor Identity** - Manage visitor IDs and identity
- **Consent** - Basic consent status and category management

## Installation

```sh
npm install tealium-prism-react-native
# or
yarn add tealium-prism-react-native
```

### iOS Setup

```sh
cd ios && pod install
```

### Android Setup

No additional setup required - dependencies are automatically resolved via Gradle.

## Quick Start

```typescript
import Tealium, { TealiumEvent, TealiumView } from 'tealium-prism-react-native';

// Initialize Tealium
await Tealium.initialize({
  account: 'your-account',
  profile: 'your-profile',
  environment: 'dev', // 'dev', 'qa', or 'prod'
  logLevel: 'debug',  // optional
});

// Track a view
Tealium.track(new TealiumView('home_screen', { category: 'main' }));

// Track an event
Tealium.track(new TealiumEvent('button_click', { button_id: 'submit' }));

// Or use convenience methods
await Tealium.trackView('home_screen');
await Tealium.trackEvent('button_click', { button_id: 'submit' });
```

## API Reference

### Initialization

```typescript
// Initialize with configuration
const success = await Tealium.initialize({
  account: string;           // Required: Tealium account name
  profile: string;           // Required: Tealium profile name
  environment: 'dev' | 'qa' | 'prod';  // Required: Environment
  dataSource?: string;       // Optional: Data source key
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';
  settingsFile?: string;     // Optional: Local settings file path
  settingsUrl?: string;      // Optional: Remote settings URL
});

// Check initialization status
const isInit = await Tealium.isInitialized();
const hasInit = Tealium.hasInitialized; // Synchronous check

// Shutdown
Tealium.shutdown();
```

### Tracking

```typescript
// Track using TealiumView/TealiumEvent classes
import { TealiumView, TealiumEvent } from 'tealium-prism-react-native';

Tealium.track(new TealiumView('screen_name', { key: 'value' }));
Tealium.track(new TealiumEvent('event_name', { key: 'value' }));

// Convenience methods
await Tealium.trackView('screen_name', { key: 'value' });
await Tealium.trackEvent('event_name', { key: 'value' });

// Flush queued events
await Tealium.flushEventQueue();
```

### Data Layer

```typescript
// Add data with expiry
Tealium.addData({
  user_id: '12345',
  user_type: 'premium',
}, 'session'); // 'session', 'forever', or 'untilRestart'

// Get data
const value = await Tealium.getData('user_id');

// Remove data
Tealium.removeData('user_id');
Tealium.removeData(['user_id', 'user_type']); // Multiple keys
```

### Trace (Debugging)

```typescript
// Join a trace session
Tealium.joinTrace('your-trace-id');

// Leave trace
Tealium.leaveTrace();
```

### Visitor Identity

```typescript
// Get visitor ID
const visitorId = await Tealium.getVisitorId();

// Reset visitor ID (generates new anonymous ID)
const newId = await Tealium.resetVisitorId();

// Clear all stored visitor IDs
const freshId = await Tealium.clearStoredVisitorIds();
```

### Consent

```typescript
// Set consent status
Tealium.setConsentStatus('consented');    // User opted in
Tealium.setConsentStatus('notConsented'); // User opted out
Tealium.setConsentStatus('unknown');      // Reset

// Get consent status
const status = await Tealium.getConsentStatus();

// Set consent categories
Tealium.setConsentCategories(['analytics', 'personalization']);

// Get consent categories
const categories = await Tealium.getConsentCategories();
```

## Types

```typescript
type Environment = 'dev' | 'qa' | 'prod';
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';
type Expiry = 'session' | 'forever' | 'untilRestart';
type ConsentStatus = 'consented' | 'notConsented' | 'unknown';
type ConsentCategory = 
  | 'analytics' | 'affiliates' | 'displayAds' | 'email'
  | 'personalization' | 'search' | 'social' | 'bigData'
  | 'mobile' | 'engagement' | 'monitoring' | 'crm'
  | 'cdp' | 'cookieMatch' | 'misc';
```

## Example App

See the [example](./example) directory for a complete React Native app demonstrating all features.

To run the example:

```sh
# Install dependencies
yarn install

# iOS
cd example/ios && pod install && cd ..
yarn example ios

# Android
yarn example android
```

## Development

### Building

```sh
# Type check
yarn typecheck

# Lint
yarn lint

# Build
yarn prepare
```

## Native SDK Versions

| SDK | Version | Repository |
|-----|---------|------------|
| [Tealium Prism Swift](https://github.com/Tealium/tealium-prism-swift) | 0.3.0+ | iOS |
| [Tealium Prism Kotlin](https://github.com/Tealium/tealium-prism-kotlin) | 0.3.0+ | Android |

## Requirements

- React Native 0.83.0+
- iOS 13.0+
- Android API 24+
- Node.js 20+

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
