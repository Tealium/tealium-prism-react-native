# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Library Development
```sh
yarn typecheck          # TypeScript type checking
yarn lint               # ESLint on all .js/.ts/.tsx files
yarn test               # Run Jest tests
yarn prepare            # Build the library (react-native-builder-bob → lib/)
yarn clean              # Delete all build artifacts
```

### Example App
```sh
yarn example ios        # Run example on iOS simulator
yarn example android    # Run example on Android emulator
yarn example start      # Start Metro bundler for example app
```

### Running a Single Test
```sh
yarn test --testPathPattern="<filename>"
```

## Architecture

This is a **React Native TurboModule SDK** that bridges the Tealium Prism native SDKs (Swift on iOS, Kotlin on Android) to a unified TypeScript API.

### Layer Stack

```
TypeScript API (src/)
    └── TurboModule Spec (NativeTealiumPrismReactNative.ts)
         ├── iOS: TealiumPrismReactNative.mm → TealiumPrismBridge.swift → Tealium Prism Swift SDK
         └── Android: TealiumPrismReactNativeModule.kt → Tealium Prism Kotlin SDK
```

### Project Layout

- **`src/index.tsx`** — The `Tealium` singleton class. Owns lazy-initialized sub-API instances and the `NativeEventEmitter` for data layer events. All public API surface lives here.
- **`src/NativeTealiumPrismReactNative.ts`** — TurboModule specification. Every native method must be declared here as the JS↔Native contract.
- **`src/types.ts`** — All shared TypeScript types (`TealiumConfig`, `EngineResponse`, `Expiry`, etc.).
- **`src/api/`** — Sub-API classes (`DataLayerAPI`, `TraceAPI`, `DeepLinkAPI`, `LifecycleAPI`, `MomentsAPI`, `ConsentAPI`). Each wraps a slice of the native module interface.
- **`ios/TealiumPrismReactNative.mm`** — Objective-C++ TurboModule entry point. Registers the module, defines supported events and constants, and delegates to the Swift bridge.
- **`ios/TealiumPrismBridge.swift`** — Swift implementation. Maps JS types to native Tealium SDK types and calls the Prism Swift SDK.
- **`android/.../TealiumPrismReactNativeModule.kt`** — Kotlin implementation. Extends the generated `NativeTealiumPrismReactNativeSpec`.
- **`example/src/App.tsx`** — Full-featured demo exercising every API surface. Useful as a reference when adding new features.
- **`lib/`** — Generated build output (ESM + TypeScript declarations). Never edit manually; produced by `yarn prepare`.

### Sub-API Model

`Tealium` exposes sub-APIs as lazily initialized properties:
```typescript
Tealium.dataLayer   // DataLayerAPI
Tealium.trace       // TraceAPI
Tealium.deepLink    // DeepLinkAPI
Tealium.lifecycle   // LifecycleAPI
Tealium.momentsAPI  // MomentsAPI
Tealium.consent     // ConsentAPI
```
Each sub-API holds a reference to the `NativeTealiumPrism` module and delegates calls to it.

### Native Event Emission

Data layer change events (`TealiumDataLayerUpdated`, `TealiumDataLayerRemoved`) flow native→JS via `NativeEventEmitter`. Event name constants are defined in `TealiumEvents` in `src/types.ts`. The emitter is created once in `Tealium` and passed down to `DataLayerAPI`, which manages subscriptions via `addListener`/`removeListener`.

### Adding a New Native Method

1. Declare the method signature in `src/NativeTealiumPrismReactNative.ts`
2. Implement it in `ios/TealiumPrismBridge.swift`
3. Implement it in `android/.../TealiumPrismReactNativeModule.kt`
4. Expose it through `src/index.tsx` or a sub-API in `src/api/`
5. Update `example/src/App.tsx` to demonstrate the feature

### Build System

The library is built with **react-native-builder-bob** (configured in `package.json` under `"react-native-builder-bob"`). It outputs ESM modules to `lib/module/` and TypeScript declarations to `lib/typescript/`. TypeScript is in strict mode (`noUnusedLocals`, `noUncheckedIndexedAccess`, etc.).

This is a **Yarn workspaces monorepo**: root = library, `example/` = separate workspace for the demo app.

### Gotchas

- **Data layer `put()` dispatches by JS type.** `DataLayerAPI.put()` inspects the value at runtime and calls the corresponding typed native method (`setDataLayerString`, `setDataLayerNumber`, etc.). Arrays of non-strings are silently dropped.
- **Event subscriptions are auto-managed.** `DataLayerAPI` reference-counts listeners and calls `enableDataLayerEvents()` / `disableDataLayerEvents()` on the native module automatically when the first subscriber is added or last removed.
- **`shutdown()` nullifies sub-API instances.** Any references captured before `shutdown()` (e.g. `const dl = Tealium.dataLayer`) will point to stale objects after shutdown.
- **`create()` injects plugin metadata.** After `initialize()`, `Tealium.create()` auto-sets `plugin_name` and `plugin_version` in the data layer.
- **Transactional data layer.** `DataLayerAPI.transactionally()` enables atomic multi-key read-modify-write operations via a `TransactionContext` callback. Operations are batched and sent to native in a single call.

### Platform Requirements

- iOS 15.1+ (set by RN's `min_ios_version_supported`), Xcode with Swift support, CocoaPods (`TealiumPrismReactNative.podspec`)
- Android API 24+, Kotlin 2.1+, Gradle 8+ — native SDK modules have distinct versions: `prism-core:0.3.0`, `prism-lifecycle:0.2.0`, `prism-moments-api:0.1.0`
- React Native 0.83+, Node 20+
