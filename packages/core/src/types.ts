/**
 * Shared TypeScript types for the bridge data contract.
 * These are compile-time-only aliases — not runtime classes.
 */

/**
 * Any JSON-serializable value that can cross the React Native bridge.
 *
 * Named `JsonValue` (not `DataItem`) to avoid colliding with the native Prism
 * `DataItem` wrapper, and to keep the `DataItem` name free for a possible
 * future JS class that exposes the SDK's typed accessors.
 *
 * Only JSON values are valid: `Date`, functions, `undefined`, `Symbol`, and
 * `BigInt` cannot cross the bridge. `null` is a valid value (it maps to
 * `NSNull()` on iOS and `DataItem.NULL` on Android).
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * A JSON object: the JS-side shape that maps to the native SDK `DataObject`.
 */
export type JsonValueObject = Record<string, JsonValue>;
