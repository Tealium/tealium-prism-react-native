---
applyTo: 'android/**/*.{kt,java}'
---

# Android Native Bridge Review Instructions

## Architecture

The Android bridge is a single Kotlin file:
- **`TealiumPrismReactNativeModule.kt`** — Extends `NativeTealiumPrismReactNativeSpec` (codegen'd from the TurboModule spec). Talks directly to the Tealium Prism Kotlin SDK.

The native Kotlin SDK is consumed via Maven: `com.tealium.prism:prism-core`, `prism-lifecycle`, `prism-moments-api`.

## Review Checklist

### Type Conversion
- JS types arrive as `ReadableMap`, `ReadableArray`, `String`, `Double`, `Boolean`.
- React Native passes all numbers as `Double` — integer conversion must be explicit where the native SDK expects `Int`/`Long`.
- `ReadableMap.getString()` can return `null` — never assume non-null without checking `hasKey()` first.
- Verify `ReadableArray` element access is bounds-checked.

### Promise Handling
- Every method with a `Promise` parameter must call either `promise.resolve()` or `promise.reject()` on ALL code paths, including exception handlers.
- Use `try/catch` around SDK calls.
- Reject with descriptive error codes: `promise.reject("NOT_INITIALIZED", "Tealium is not initialized", exception)`.

### Event Emission
- Event names must match exactly: `TealiumDataLayerUpdated`, `TealiumDataLayerRemoved`.
- Use `reactApplicationContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)` for emission.
- Guard event emission behind the enabled/disabled flag.

### Thread Safety
- Bridge methods run on the JS thread by default.
- SDK operations that do I/O or touch shared state should use coroutines or dispatch to a background thread.
- Never block the JS thread with synchronous I/O.

### Parity with iOS
- Every method in the TurboModule spec must exist on both platforms.
- Behavior, parameters, return types, and error cases should mirror the iOS implementation.
- If platform-specific behavior is unavoidable, document it clearly.

## Kotlin Style
- 4-space indentation.
- Use Kotlin idioms: `?.let`, `when`, data classes, sealed classes.
- Prefer `val` over `var`.
- Use `companion object` for constants, not top-level vals.

## Common Pitfalls
- **ReadableMap key mismatches** — Config keys must match exactly what the TurboModule spec sends. A typo silently drops config values.
- **Lifecycle** — The module may outlive the Tealium instance (after `shutdown()`). Guard against use-after-shutdown with null checks on the Tealium reference.
- **Context leaks** — Never hold a strong reference to `Activity`. Use `reactApplicationContext` (Application context) for SDK initialization.
- **Gradle dependency versions** — Must stay in sync with what the podspec declares for iOS. Version drift between platforms causes subtle behavior differences.
