# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# React Native wrapper rules for Claude

## Source policy

* For Prism ground truth, use only `Tealium/tealium-prism-swift` and `Tealium/tealium-prism-kotlin`.
* For React Native behavior, use only official React Native docs and the official React Native repository.
* Do not derive wrapper rules from PRs, Confluence pages, or other secondary sources.

## Mental model

* Treat the wrapper as a thin adapter over the native Prism SDKs, not as a place to invent new Prism behavior.

* Keep the wrapper aligned with native Prism concepts rather than designing a parallel abstraction model in JavaScript.

* The wrapper should stay thin: use JavaScript and TypeScript for contract shape, ergonomics, and small bridge-side normalization, but keep Prism behavior, configuration semantics, and execution flow native.

* Model the wrapper around the same core nouns the native SDKs use: `TealiumConfig`, `ModuleFactory`, modules, barriers, transformations, `DataObject`, and `DataItem`.

* When a feature exists natively on both platforms, expose it in a way that preserves that native meaning instead of flattening it into a looser convenience API.

* The Swift repo documents module factories, module lifecycle management, queue-driven tracking, and settings composition, while Kotlin exposes the same family of concepts through `TealiumConfig`, `ModuleFactory`, barriers, rules, and transformation builders.

## React Native architecture rules

* Prefer Turbo Native Modules as the primary integration model. React Native’s official flow is to define a typed JavaScript or TypeScript spec, run Codegen, write app code against that spec, and implement the generated native interfaces on Android and iOS.

* Keep one typed TS spec as the contract. When the contract changes, update JavaScript and both native implementations together.

* Default to TurboModules and the New Architecture when designing the wrapper from scratch. Only add legacy Native Module support when backward compatibility is an explicit requirement for consumers running with the legacy architecture.

## Bridge data rules

* Only send serializable values across the React Native boundary. React Native’s TurboModule docs define the spec as the declaration of what passes between native and JS, and the legacy native-module docs limit native-to-JS values to serializable data, writable maps, and writable arrays.

* Do not expose native-only types directly through the bridge. If a native SDK concept is not directly bridge-safe, convert it inside the native implementation before returning it to JavaScript.

* Preserve Prism’s typed data model instead of flattening everything into untyped blobs. Swift documents `DataObject` and `DataItem` as core SDK data types, and Kotlin uses `DataObject` to build enforced SDK settings and configuration state.

* Prefer explicit conversion at the bridge boundary over implicit coercion in JavaScript.

* Keep type fidelity where practical. If native APIs distinguish between data shapes or value categories, the wrapper should preserve those distinctions instead of collapsing them into broad `any`-style inputs.

* Use JavaScript-facing types that map cleanly onto native implementations, and do bridge-only normalization inside the wrapper or native layer rather than leaking ambiguous data handling to consumers.

## Async, threading, and event rules

* Prefer Promises for one-shot async operations and event emitters for ongoing native-to-JS signals. React Native’s official native-module docs present Promises as the cleaner JS-facing shape for async work and `NativeEventEmitter` or `RCTEventEmitter` for pushed events.

* Avoid synchronous bridge methods unless there is a strong reason. React Native explicitly warns that synchronous methods can hurt performance, introduce threading bugs, and disable the Chrome debugger.

* If the wrapper exposes native-to-JS subscriptions, design listener lifecycle explicitly. Use the event model required by the chosen React Native architecture, and do not assume legacy event-emitter hooks are needed unless legacy support is an explicit requirement.

* Do not rely on React Native’s current calling thread as if it were stable API. React Native says native modules should not assume what thread they run on and should dispatch heavy work to their own queues, while the Swift Prism SDK documents that SDK operations run on `TealiumQueue.worker` and are exposed through `AsyncProxy` for thread-safe public access.

## Native SDK alignment rules

* Mirror Prism configuration semantics instead of inventing wrapper-specific ones. Swift and Kotlin both expose `TealiumConfig` for account or profile identity, settings sources, module registration, and optional programmatic overrides.

* Preserve settings precedence exactly. Swift and Kotlin both document local settings as lowest priority, remote settings above local, and programmatic or enforced settings above both.

* Keep module registration aligned with native patterns. Swift uses `ModuleFactory` values added to `TealiumConfig`, and Kotlin’s `TealiumConfig.Builder` likewise starts from a list of `ModuleFactory` instances.

* Respect Prism’s native queue and pipeline model instead of moving Prism logic into JavaScript. The Swift repo documents a queue-backed tracking pipeline made of collectors, transformations, consent checks, barriers, dispatcher queues, and completion handling.

## Implementation workflow

* Start with the typed TS contract, then implement Android and iOS against that contract, then expose the final JS wrapper API.

* Keep the JS wrapper thin and typed. React Native’s native-module docs recommend wrapping `NativeModules` in a JS module and placing type annotations there, while TurboModules go further and make the typed spec itself the contract.

* When a wrapper feature needs special conversion, queueing, or native coordination, do that work on the native side rather than expecting JavaScript to orchestrate native execution details.

## Testing and iteration rules

* Rebuild the native app when validating native changes. React Native explicitly notes that Metro can reload JavaScript changes, but native code changes require a native rebuild.

* Keep both platform implementations testable and aligned with the native SDKs. The Swift repo treats tests as first-class with dedicated schemes, module-organized test directories, and test helpers, and the Kotlin core module is configured with both unit-test and Android-test dependencies.

## Code style rules

Generated JS/TS code must pass `yarn lint` without errors. Key rules enforced by [eslint.config.mjs](eslint.config.mjs):

* Use double quotes for strings (`prettier/prettier`).
* No `eval` or `new Function` (`no-eval`, `no-new-func`).
* No unused variables — prefix intentionally unused params/destructured vars with `_` in TypeScript files (`@typescript-eslint/no-unused-vars`).
* React hooks must follow the rules of hooks and declare exhaustive deps (`react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`).
* No inline styles in React Native components (`react-native/no-inline-styles`).
* Use `===` instead of `==` except null checks (`eqeqeq: allow-null`).
* No `eslint-disable` comments that disable more rules than needed or are never used (`eslint-comments/*`).
* TypeScript files: no `no-shadow` (use `@typescript-eslint/no-shadow`), no `no-undef` (TypeScript handles this), no `no-unused-vars` (use `@typescript-eslint/no-unused-vars`).

After generating any JS/TS code, mentally verify it against these rules before presenting it.

## Practical default stance

* Default to TurboModule-first design.
* Default to serializable bridge values only.
* Default to Promise-based one-shot APIs.
* Default to event emitters for subscriptions.
* Default to Prism-native semantics over wrapper convenience.
* Default to keeping JavaScript thin and native logic authoritative.
