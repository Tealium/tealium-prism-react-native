---
applyTo: 'src/**/*.{ts,tsx}'
---

# TypeScript Review Instructions

## Strict Mode Enforcement

TypeScript is configured with maximum strictness. Flag violations of:
- `noUnusedLocals` / `noUnusedParameters` — No dead code.
- `noImplicitReturns` — All code paths must return.
- `noUncheckedIndexedAccess` — Index access returns `T | undefined`. Verify callers handle the `undefined` case.
- `noFallthroughCasesInSwitch` — Every `case` needs `break`/`return`.

## Type Conventions

- **String literal unions over enums.** This project uses `type Environment = 'dev' | 'qa' | 'prod'` instead of `enum`. Do not introduce TypeScript enums.
- **`interface` for object shapes, `type` for unions.** Example: `interface TealiumConfig { ... }` but `type DataItem = { type: 'string'; ... } | { type: 'number'; ... }`.
- **Discriminated unions for polymorphic data.** `DataItem` uses `type` field as discriminant. New variants must follow this pattern.
- **`readonly` on immutable properties.** Classes like `TealiumView` and `TealiumEvent` use `public readonly` fields.
- **All shared types live in `src/types.ts`.** Do not scatter type definitions across files. API-specific types still go here.

## TurboModule Spec (`NativeTealiumPrismReactNative.ts`)

This file is the JS-native contract. Extra rules:
- Only JSON-serializable types are allowed (no `Date`, `Map`, `Set`, classes, functions).
- Use `Object` (not `Record<string, unknown>`) for generic objects — this is a TurboModule codegen requirement.
- Use `string` for enums/unions on the spec side (native doesn't understand TS unions). The public API in `src/index.tsx` or `src/api/` narrows these to proper union types.
- Every method here MUST have a corresponding implementation on both iOS and Android.

## Public API (`src/index.tsx` and `src/api/`)

- The `Tealium` class is a **singleton with static methods**. Do not instantiate it.
- Sub-APIs (`DataLayerAPI`, `TraceAPI`, etc.) are accessed via lazy getters on `Tealium`.
- `DataLayerAPI.put()` dispatches by runtime JS type to typed native methods. When adding new supported types, update the dispatch logic AND the JSDoc.
- Event subscriptions are reference-counted. Adding/removing listeners must maintain the count correctly or native events leak.

## Error Handling

- Use `console.warn('[Tealium] ...')` for recoverable warnings (e.g., unsupported type in `put()`). Always prefix with `[Tealium]`.
- Use promise rejection for native errors.
- Do not throw synchronous exceptions from public API methods unless it's a programmer error (e.g., calling before init).

## Documentation

- All exported functions, classes, and types MUST have JSDoc with `@param`, `@returns`, and `@example` where useful.
- Mark internal APIs with `/** @internal */`.
- Comments explain "why", not "what".

## Naming

- Files: `camelCase.ts` or `PascalCase.ts` for class-centric files.
- Classes/Types: `PascalCase`.
- Variables/Functions: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` for true constants (e.g., `TealiumEvents`).
- Unused parameters: prefix with `_`.
