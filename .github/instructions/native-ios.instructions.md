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

#### JS → Obj-C bridged primitives
- JS types arrive as Objective-C bridged types (`NSString`, `NSNumber`, `NSDictionary`, `NSArray`).
- Verify safe unwrapping — force-unwraps on bridge input are bugs. Prefer `guard let … as? T else { reject/return }`.
- `nil` vs `NSNull` — both can arrive from JS. Cast with `as?` rejects `NSNull` automatically; explicit `is NSNull` check needed only when JSON-style nulls are semantically meaningful.
- **Number vs Bool disambiguation**: `NSNumber` wraps both `Bool` and numeric types. A JS `true` cast as `NSNumber.doubleValue` gives `1.0`. Use `CFGetTypeID(value as CFTypeRef) == CFBooleanGetTypeID()` to detect booleans *before* falling through to `NSNumber.doubleValue` — see `convertArrayToDataInputList` for the canonical pattern. Inside homogeneous typed methods (`setDataLayerBoolean` etc.) the TurboModule spec already guarantees the type, so the Bool/Number check is only needed in `setDataLayerList` and nested array paths.
- Integer vs Double: the SDK stores numbers as `Double`. Don't introduce an `Int` path — it fragments the data layer.

#### DataLayer value mapping (Swift SDK converters)
- `DataInput` / `DataInputConvertible` — scalar values (`String`, `Bool`, `Double`, nested `DataObject`) accepted by `DataLayer.put(key:converting:expiry:)`. Homogeneous arrays of convertibles also conform.
- `DataObject` — opaque map of `DataItem`s. Built from JS dicts via the `dataObject(from:)` helper, which recursively:
  1. Matches `DataInputConvertible` (String / Bool / NSNumber → Double).
  2. Matches `[DataInputConvertible]` for homogeneous primitive arrays.
  3. Recurses on `[String: Any]` nested dicts.
  4. Recurses on `[[String: Any]]` nested dict arrays.
  Any value that doesn't match the four branches is **silently dropped**. New JS input types require a new branch here.
- `DataItem` — the read side. `item.get(as: T.self)` probes by type and returns `nil` if the stored value isn't assignable to `T`. Probe order in `dataItemToDictionary` / `dataItemToAny` is **Bool before Double** because `NSNumber.boolValue` and `doubleValue` both succeed for stored Bools, but `Double` first would lose the type tag.
- `convertArrayToDataInputList(_ NSArray) -> [DataInput]` — used by `setDataLayerList` for heterogeneous JS arrays. Each element is classified per-item (String / Bool / Double / nested dict / nested array). Dropping an untyped element here hides data; verify new branches are exhaustive.

#### Custom initializers & enum mappings
- `TealiumConfig(account:profile:environment:dataSource:modules:settingsFile:settingsUrl:forcingSettings:)` — positional init; `existingVisitorId` and `cmpAdapter` are post-set properties. Adding a new config field means adding it to the JS `TealiumConfig` type, the `create()` dictionary unpacking, **and** the native init call. Silent drops are the common failure mode.
- `CoreSettingsBuilder` — chained builder returned from `forcingSettings` closure. Only apply when ≥1 core setting is present (see `hasAnyCoreSetting` guard) — passing an empty builder overrides SDK defaults.
- `Int64(seconds).seconds` — time values pass through the SDK's `.seconds` extension. Don't pass raw `Int`; the builder signature requires the `Duration` type.
- `LogLevel.Minimum(from: String)` — failable init. Return of `nil` means the string didn't match a known level and the setting should be skipped, not forced to a default.
- `ConsentDecision(decisionType:purposes:)` — `DecisionType` is `.explicit` / `.implicit`. String mapping is `lowercased()`-compared; keep the comparison lowercase in any new entry points (`create`, `setConsentDecision`).
- `BridgeCMPAdapter(id:defaultDecision:)` — custom bridge type. `allPurposes` is a post-init property set from `consentPurposes`. Lifecycle: retain on `self.bridgeCMPAdapter` so it outlives `TealiumConfig`; nil out on `shutdown()`.
- `Expiry` — `.session` / `.untilRestart` / `.forever` via `expiryFromString`. Default branch is `.forever` — confirm that's the intended fallback for any new caller.
- `DispatchType` — `.view` / `.event` via `track(...)` `type` string. Lowercased compare; unknown string falls through to `.event`.
- `Referrer` — `.url(URL)` case used by `handleDeepLink`. Invalid URL string must `completion(false)` without calling the SDK.

#### Return-path conversion
- `dataItemToDictionary` returns a tagged `{ type, value }` shape for JS (`string` / `boolean` / `number` / `list` / `object` / `null`). Tags are part of the public JS API surface — don't rename without updating the TS types.
- `dataItemToAny` returns raw untagged values for `getAllData` / transactional reads. Nulls are dropped via `compactMap` / `compactMapValues`; this is intentional (the JS side never sees explicit nulls in bulk reads).

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
