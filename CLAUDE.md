# CLAUDE.md

Guidance for Claude Code when working in this repository — a thin React Native wrapper over the native Prism SDKs.

## Source policy

* Prism ground truth: only `Tealium/tealium-prism-swift` and `Tealium/tealium-prism-kotlin`.
* React Native behavior: only official RN docs and the official RN repository.
* Don't derive wrapper rules from PRs, Confluence, or other secondary sources.

## Mental model

* The wrapper is a thin adapter, not a place to invent Prism behavior or a parallel JS abstraction model.
* Use JS/TS only for contract shape, ergonomics, and small bridge-side normalization; keep Prism behavior, config semantics, and execution flow native.
* Model around the same nouns as the SDKs: `TealiumConfig`, `ModuleFactory`, modules, barriers, transformations, `DataObject`, `DataItem`.
* When a feature exists natively on both platforms, expose it preserving that native meaning — don't flatten it into a looser convenience API.

## React Native architecture rules

* TurboModules + New Architecture only; no legacy Native Module support. Follow RN's flow: typed TS spec → Codegen → app code against the spec → implement generated native interfaces on both platforms.
* One typed TS spec is the single source of truth. When the contract changes, update JS and both native implementations together.

## Bridge data rules

* Only serializable values cross the boundary. Don't expose native-only types directly — convert them inside the native implementation before returning to JS.
* Preserve Prism's typed data model; don't flatten to untyped blobs. `JsonValueObject`/`JsonValue` are TS type aliases, not classes — consumers pass plain objects/primitives, and the native layer converts to `DataObject`/`DataItem` at the boundary.
* Whole numbers are a platform-internal asymmetry, not JS-visible: a whole JS number (`42.0`) round-trips through an `Int`-like `NSNumber` on iOS but stays `Double` on Android; JS `number` is always IEEE-754 double, so the JS-visible value is identical. Don't add a manual whole-number→integer heuristic at the bridge — delegate to the SDK converters.
* Prefer explicit conversion at the boundary over implicit JS coercion. Keep type fidelity: preserve native data-shape/value distinctions instead of collapsing to `any`.

## Async, threading, and event rules

* Promises for one-shot async ops; the TurboModule `EventEmitter` spec for ongoing native-to-JS signals (never `RCTEventEmitter` or legacy event-emitter hooks). Design listener lifecycle explicitly.
* Don't assume the calling thread is stable API. RN says native modules should dispatch heavy work to their own queues; the Swift SDK runs operations on `TealiumQueue.worker`, exposed via `AsyncProxy` for thread-safe public access.
* Async TurboModule methods run native work off-thread and resolve/reject the `Promise` from a completion callback that fires on whatever thread the op finished on. Calls can run and complete concurrently, and the callback is not guaranteed to be on the calling thread — treat every promise-backed method as a potential source of concurrent access to shared state.
* Don't introduce mutable shared state guarded by non-thread-safe collections accessed from async callbacks (e.g. a plain `mutableMapOf`/Swift `Dictionary` registry of instances or subscriptions). Arbitrary-thread callbacks race on unsynchronized collections.
* Prefer the SDK's thread-safe capabilities over reimplementing them: Kotlin's `Tealium` companion `InstanceManager` (`create`/`get`/`shutdown`) and Swift's `TealiumInstanceManager.shared` serialize instance lookup/lifecycle on `TealiumQueue`. If an SDK gap forces a wrapper-side workaround (e.g. Swift's weak-only instance retention), keep it minimal, mark it with a `TODO`, and add no shared unsynchronized collections.

## Native SDK alignment rules

* Mirror Prism config semantics; don't invent wrapper-specific ones. Both platforms expose `TealiumConfig` for account/profile identity, settings sources, module registration, and optional programmatic overrides.
* Preserve settings precedence exactly: local (lowest) < remote < programmatic/enforced.
* Keep module registration native: Swift adds `ModuleFactory` values to `TealiumConfig`; Kotlin's `TealiumConfig.Builder` starts from a list of `ModuleFactory`s. All core factories are registered by default, but a module is instantiated only when settings exist for it (enforced, local, or remote). Mandatory modules (DataLayer, TealiumData, core transformers) carry enforced settings and always initialize; optional modules (Collect, Lifecycle, etc.) need local/remote JSON settings to run.
* Respect Prism's native queue/pipeline model (collectors, transformations, consent checks, barriers, dispatcher queues, completion handling); don't move Prism logic into JS.

## Implementation workflow

* Order: typed TS contract → Android + iOS against it → final JS wrapper API.
* Keep the JS wrapper thin and typed against the generated spec. Don't hand-write type annotations over `NativeModules`.
* When a feature needs special conversion, queueing, or native coordination, do it natively — don't have JS orchestrate native execution details.

## Testing and iteration rules

* Native code changes require a native rebuild (Metro only reloads JS).
* Keep both platforms testable and aligned with the SDKs (dedicated Swift test schemes/helpers; Kotlin core unit + Android test deps).

## Code style rules

Generated JS/TS must pass `yarn lint` (see [eslint.config.mjs](eslint.config.mjs)):

* Double quotes (`prettier/prettier`); `===` except null checks (`eqeqeq: allow-null`).
* No `eval`/`new Function` (`no-eval`, `no-new-func`).
* No unused vars — prefix intentionally unused params/destructured vars with `_` (`@typescript-eslint/no-unused-vars`).
* React hooks: rules-of-hooks + exhaustive deps; no inline styles in RN components.
* No `eslint-disable` comments that over-disable or are unused (`eslint-comments/*`).
* TS files use the `@typescript-eslint` variants of `no-shadow`/`no-unused-vars`; `no-undef` is off (TS handles it).

## Practical default stance

TurboModule-first · serializable bridge values only · Promise-based one-shot APIs · event emitters for subscriptions · Prism-native semantics over wrapper convenience · thin JS, authoritative native logic.
