---
applyTo: '**/*'
---

# Tealium Prism React Native — General Review Guidelines

## Project Overview

This is a **React Native TurboModule SDK** that bridges the Tealium Prism native SDKs (Swift on iOS, Kotlin on Android) to a unified TypeScript API. It is a library consumed by other apps, not a standalone application.

## Architecture (must understand before reviewing)

```
TypeScript API (src/)
    └── TurboModule Spec (NativeTealiumPrismReactNative.ts)
         ├── iOS: TealiumPrismReactNative.mm → TealiumPrismBridge.swift → Tealium Prism Swift SDK
         └── Android: TealiumPrismReactNativeModule.kt → Tealium Prism Kotlin SDK
```

### Key Invariants

- **TurboModule spec is the contract.** Every native method MUST be declared in `src/NativeTealiumPrismReactNative.ts`. If a method exists in native code but not in the spec, it's unreachable.
- **Five-point checklist for new native methods.** Any new native method requires changes in: (1) TurboModule spec, (2) iOS Swift bridge, (3) Android Kotlin module, (4) TypeScript API exposure, (5) example app demo.
- **Sub-APIs are lazily initialized.** `Tealium.dataLayer`, `.trace`, `.deepLink`, `.consent` etc. are created on first access. References captured before `shutdown()` become stale after it.
- **Data layer events are reference-counted.** `DataLayerAPI` auto-enables/disables native event emission based on active listener count.
- **`create()` injects metadata.** After `initialize()`, `plugin_name` and `plugin_version` are auto-set.

## Code Style

- 2-space indentation, single quotes, trailing commas (es5), LF line endings.
- Formatting is enforced by Prettier — do not flag formatting-only issues.
- All comments and documentation MUST be in English.
- Comments should explain "why", not "what". Do not request comments on self-explanatory code.

## What to Focus On

1. **Correctness** — Does the code do what it claims? Are edge cases handled?
2. **Type safety** — Are types precise? Are `any`/`unknown` casts justified?
3. **API consistency** — Does the public API follow existing patterns (naming, signatures)?
4. **Native parity** — Are iOS and Android implementations symmetrical?
5. **Breaking changes** — Does this change the public API surface? Is it intentional?

## What NOT to Flag

- Formatting or whitespace (Prettier handles this).
- Missing comments on obvious code.
- Style preferences that contradict existing patterns.
- Suggestions to add features beyond the PR scope (YAGNI).
- Suggestions to add abstractions for single use cases.
