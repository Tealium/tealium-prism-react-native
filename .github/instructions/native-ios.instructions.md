---
applyTo: 'ios/**/*.{swift,mm,m,h}'
---

# iOS Native Bridge Review Instructions

## Architecture

The iOS bridge has two layers:
1. **`TealiumPrismReactNative.mm`** — Objective-C++ TurboModule entry point. Registers the module, defines supported events/constants, delegates everything to Swift.
2. **`TealiumPrismBridge.swift`** — Swift singleton (`TealiumPrismBridge.shared`) that talks to the Tealium Prism Swift SDK.

The native Swift SDK is consumed via CocoaPods: `tealium-prism/Core`, `tealium-prism/Lifecycle`, `tealium-prism/MomentsAPI`.

## Review Checklist

### Type Conversion
- JS types arrive as Objective-C bridged types (`NSString`, `NSNumber`, `NSDictionary`, `NSArray`).
- Verify safe unwrapping — force-unwraps on bridge input are bugs.
- Number→Bool conversion must be explicit (NSNumber wraps both).
- `nil` vs `NSNull` — both can arrive from JS. Handle both.

### Promise Handling
- Every method with a `Promise` signature must call either `resolve()` or `reject()` on ALL code paths. Missing resolution = JS hangs forever.
- Use `@try/@catch` blocks around SDK calls that might throw `NSException`.
- Reject with descriptive error codes and messages (e.g., `"NOT_INITIALIZED"`, `"INVALID_CONFIG"`).

### Event Emission
- Event names must match exactly: `TealiumDataLayerUpdated`, `TealiumDataLayerRemoved`.
- Events must only be sent when `enableDataLayerEvents()` has been called (guard with a flag).
- The `.mm` file must list all supported events in `supportedEvents`.

### Thread Safety
- Bridge methods may be called from any JS thread.
- SDK calls that touch shared state should dispatch to the appropriate queue.
- Never block the main thread with synchronous SDK operations.

### Parity with Android
- Every method in the TurboModule spec must exist on both platforms.
- Behavior should be identical: same parameters, same return types, same error cases.
- If platform-specific behavior is unavoidable, document it clearly.

## Swift Style
- 4-space indentation (per project's `.swift-format`).
- Use `guard let` for early returns rather than deeply nested `if let`.
- Prefer value types where possible.
- Mark classes as `final` unless designed for subclassing.

## Common Pitfalls
- **Config dictionary keys** — Must match exactly what the TurboModule spec sends. A typo here silently drops config values.
- **Lifecycle** — The bridge singleton may outlive the Tealium instance (after `shutdown()`). Guard against use-after-shutdown.
- **Memory** — Closures capturing `self` in the bridge can create retain cycles. Use `[weak self]` in completion handlers.
