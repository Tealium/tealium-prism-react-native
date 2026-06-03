# Tealium Prism React Native

React Native TurboModule bridge for the Tealium Prism mobile SDKs (iOS Swift and Android Kotlin). Exposes a unified TypeScript API for event tracking, data layer management, consent, trace sessions, and deep link attribution.

> **New Architecture only.** Requires React Native 0.85+ with TurboModules enabled.

## Features

- **Initialization** — Promise-based setup with typed configuration
- **Event and view tracking** — Returns a full `TrackResult` with dispatch metadata
- **Persistent data layer** — Typed get/put/remove with expiry options and real-time subscriptions
- **Consent management** — Bridge CMP adapter with purpose-level control
- **Trace sessions** — Join/leave debug sessions for Tealium Event Stream Live
- **Deep link attribution** — Forward incoming links for attribution and trace parameter extraction
- **Visitor identity** — Reset or clear stored visitor IDs

## Installation

```sh
npm install tealium-prism-react-native
# or
yarn add tealium-prism-react-native
```

### iOS

```sh
cd ios && pod install
```

### Android

No extra setup — Gradle resolves native SDK dependencies automatically.

## Quick Start

```typescript
import Tealium from 'tealium-prism-react-native';

await Tealium.create({
  account: 'your-account',
  profile: 'your-profile',
  environment: 'prod',
});

await Tealium.track('home_screen', 'view', { category: 'main' });
await Tealium.track('button_click', 'event', { button_id: 'submit' });
```

## API Reference

### Initialization & Shutdown

```typescript
const success = await Tealium.create({
  account: 'your-account',           // required
  profile: 'your-profile',           // required
  environment: 'dev',                // 'dev' | 'qa' | 'prod'
  dataSource: 'abc123',              // optional
  logLevel: 'debug',                 // 'trace'|'debug'|'info'|'warn'|'error'|'silent'
  existingVisitorId: 'abc',          // optional: supply a known visitor ID
  visitorIdentityKey: 'email',       // optional: data layer key used as identity signal
  maxQueueSize: 100,                 // default: 100
  queueExpirationSeconds: 86400,     // default: 86400 (1 day)
  refreshIntervalSeconds: 900,       // default: 900 (15 min)
  sessionTimeoutSeconds: 300,        // default: 300 (5 min); clamped 5s–30m
});

const initialized = await Tealium.isInitialized(); // authoritative async check
const ready = Tealium.isReady;                      // synchronous local flag

await Tealium.shutdown();
```

### Tracking

```typescript
const result = await Tealium.track('screen_name', 'view', { key: 'value' });
// result: { status: 'accepted' | 'dropped', info: string, dispatch: Dispatch }

await Tealium.track('event_name', 'event', { key: 'value' });
await Tealium.track('user_login'); // type defaults to 'event'

await Tealium.flushEventQueue();
```

### Data Layer

```typescript
// Write — multi-key, atomic on the native side
await Tealium.dataLayer.put({ user_id: '123', user_type: 'premium' }, 'session');
// Expiry: 'session' | 'forever' | 'untilRestart' | { after: Date }

// Read — typed accessors
const item    = await Tealium.dataLayer.getDataItem('user_id'); // { type, value }
const str     = await Tealium.dataLayer.getString('user_id');
const num     = await Tealium.dataLayer.getDouble('score');
const flag    = await Tealium.dataLayer.getBoolean('opted_in');
const list    = await Tealium.dataLayer.getDataList('tags');
const obj     = await Tealium.dataLayer.getDataObject('metadata');
const all     = await Tealium.dataLayer.getAll();

// Remove
await Tealium.dataLayer.remove('user_id');
await Tealium.dataLayer.remove(['user_id', 'user_type']); // batched, atomic
await Tealium.dataLayer.clear();
```

### Data Layer Subscriptions

```typescript
// Subscribe — returns Disposable
const sub = Tealium.dataLayer.onDataUpdated((data) => {
  console.log('Updated keys:', Object.keys(data));
});

const sub2 = Tealium.dataLayer.onDataRemoved((keys) => {
  console.log('Removed keys:', keys);
});

// Unsubscribe
sub.dispose();
sub2.dispose();
```

Native emission starts on first subscriber and stops when the last one disposes. Subscriptions are ref-counted automatically.

### Consent

Consent management requires `cmpAdapter` in the config. All consent methods reject with `CONSENT_NOT_ENABLED` if it is not provided.

```typescript
await Tealium.create({
  // ...
  cmpAdapter: {
    id: 'my-cmp',                       // required, must match the ConsentConfiguration key in settings JSON
    allPurposes: ['analytics', 'ads'],  // optional
    defaultDecision: {
      decisionType: 'implicit',
      purposes: ['analytics'],
    },
  },
  consentConfiguration: {
    tealiumPurposeId: 'tealium',        // required when using consent
    purposes: [
      { purposeId: 'analytics', dispatcherIds: ['collect'] },
    ],
    refireDispatcherIds: ['collect'],
  },
});

await Tealium.consent.setDecision('explicit', ['analytics', 'ads']);

const decision = await Tealium.consent.getDecision();
// { decisionType: 'explicit', purposes: ['analytics', 'ads'] } | null

const purposes = await Tealium.consent.getAllPurposes();

await Tealium.consent.reset(); // revokes consent, clears stored decision

// Subscribe to changes
const sub = Tealium.consent.onDecisionChanged((decision) => {
  console.log('Consent changed:', decision);
});
sub.dispose();
```

Decisions are persisted across app restarts (UserDefaults on iOS, SharedPreferences on Android).

### Trace

All trace methods return `Promise` so errors (e.g. joining while not initialized) are observable.

```typescript
await Tealium.trace.join('your-trace-id');

const result = await Tealium.trace.forceEndOfVisit(); // TrackResult

await Tealium.trace.leave();
```

### Deep Links

```typescript
// Call from your Linking event listener
const handled = await Tealium.deepLink.handle(url, referrer);
```

### Visitor Identity

```typescript
const newId   = await Tealium.resetVisitorId();        // new anonymous ID
const freshId = await Tealium.clearStoredVisitorIds(); // wipe all stored IDs
```

## Key Types

```typescript
type Environment  = 'dev' | 'qa' | 'prod';
type LogLevel     = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';
type Expiry       = 'session' | 'forever' | 'untilRestart' | { after: Date };

interface TrackResult {
  status: 'accepted' | 'dropped';
  info: string;
  dispatch: Dispatch;
}

interface Dispatch {
  id: string;
  timestamp: number; // ms since epoch
  payload: Record<string, unknown>;
}

interface Disposable {
  readonly isDisposed: boolean;
  dispose(): void;
}
```

## Example App

See [example/](./example) for a complete app demonstrating all features.

```sh
yarn install

# iOS
yarn example ios

# Android
yarn example android
```

## Development

```sh
yarn typecheck   # TypeScript check
yarn lint        # ESLint
yarn test        # Jest
yarn prepare     # Build → lib/
```

## Requirements

| | Minimum |
|---|---|
| React Native | 0.85.0 (New Architecture) |
| iOS | 15.1 |
| Android API | 24 |
| Node.js | 20 |

## Roadmap

### Planned separate packages

| Package | Status | Notes |
|---|---|---|
| `tealium-prism-lifecycle-react-native` | Planned | Auto-tracking of app foreground/background lifecycle events |
| `tealium-prism-moments-api-react-native` | Planned | MomentsAPI — no shared state with core, self-contained |

### Not bridged in this package

| Feature | Reason |
|---|---|
| `addBarrier()` | Requires native `BarrierFactory` objects that cannot be serialized as JS config |
| `addLoadRule()` | Requires native `Rule<Condition>` objects that cannot be serialized as JS config |
| `addTransformation()` | Requires native `TransformationSettings` objects that cannot be serialized as JS config |
| `setLogHandler()` | Requires a native→JS callback held open indefinitely; no clear bridging strategy yet |
| `DataLayer.transactionally(block)` | Native API requires a synchronous callback holding the Tealium thread. TurboModule cannot make a synchronous round-trip into JS while holding that lock — any async approach either deadlocks or closes the editor before JS responds. Multi-key `put({...})` already commits atomically on the native side. |
| `DataLayer.getLong()` | JS `number` is IEEE-754 double; values above 2^53 lose precision regardless of the method used. `getDouble` covers the representable range. |
| `Tealium.key` (Kotlin only) | Internal instance lookup key. JS supplies config directly at `create()` time and has no use for it. Not exposed on iOS either. |
| `TealiumConfig.addModule()` | Allows injecting custom native modules at config time. Requires passing native `ModuleFactory` objects across the bridge — no serialization strategy defined yet. |

## Native SDKs

| SDK | Platform |
|---|---|
| [Tealium Prism Swift](https://github.com/Tealium/tealium-prism-swift) | iOS |
| [Tealium Prism Kotlin](https://github.com/Tealium/tealium-prism-kotlin) | Android |

## License

MIT
