# Tealium Prism React Native

React Native wrapper for the Tealium Prism mobile SDKs (iOS and Android).

Provides a unified TypeScript API for event tracking, data layer management, and visitor identity management.

## Features

- **Initialization** - Promise-based SDK setup with configuration options
- **Event Tracking** - Track views and events with custom data payloads
- **Data Layer** - Persistent key-value storage with expiry options
- **Trace** - Debug mode for real-time event monitoring
- **Visitor Identity** - Manage visitor IDs and identity

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
import Tealium from 'tealium-prism-react-native';

// Initialize Tealium
await Tealium.create({
  account: 'your-account',
  profile: 'your-profile',
  environment: 'dev', // 'dev', 'qa', or 'prod'
  logLevel: 'debug',  // optional
});

// Track a view
await Tealium.track('home_screen', 'view', { category: 'main' });

// Track an event
await Tealium.track('button_click', 'event', { button_id: 'submit' });
```

## API Reference

### Initialization

```typescript
// Create instance with configuration
const success = await Tealium.create({
  account: 'your-account',
  profile: 'your-profile',
  environment: 'dev', // 'dev' | 'qa' | 'prod'
  dataSource: 'abc123',       // optional
  logLevel: 'debug',          // optional: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
});

// Check initialization status
const isInit = await Tealium.isInitialized();
const isReady = Tealium.isReady; // Synchronous check

// Shutdown
Tealium.shutdown();
```

### Tracking

```typescript
// Track a view
await Tealium.track('screen_name', 'view', { key: 'value' });

// Track an event (type defaults to 'event')
await Tealium.track('event_name', 'event', { key: 'value' });

// Simple event without data
await Tealium.track('user_login');

// Flush queued events
await Tealium.flushEventQueue();
```

### Data Layer

```typescript
// Add data with expiry
Tealium.dataLayer.put({
  user_id: '12345',
  user_type: 'premium',
}, 'session'); // 'session', 'forever', or 'untilRestart'

// Get data
const value = await Tealium.dataLayer.get('user_id');

// Get all data
const allData = await Tealium.dataLayer.getAll();

// Remove data
Tealium.dataLayer.remove('user_id');
Tealium.dataLayer.remove(['user_id', 'user_type']); // Multiple keys
```

### Trace (Debugging)

```typescript
// Join a trace session
Tealium.trace.join('your-trace-id');

// Force end of visit (for testing visit-level calculations)
Tealium.trace.forceEndOfVisit();

// Leave trace
Tealium.trace.leave();
```

### Visitor Identity

```typescript
// Reset visitor ID (generates new anonymous ID)
const newId = await Tealium.resetVisitorId();

// Clear all stored visitor IDs
const freshId = await Tealium.clearStoredVisitorIds();
```

## Types

```typescript
type Environment = 'dev' | 'qa' | 'prod';
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';
type Expiry = 'session' | 'forever' | 'untilRestart';
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
