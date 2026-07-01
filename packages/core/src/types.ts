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
 * Only JSON-native types are valid. Functions, `undefined`, `Symbol`, and
 * `BigInt` are not JSON-serializable. `null` is a valid value (it maps to
 * `NSNull()` on iOS and `DataItem.NULL` on Android). `Date` is excluded
 * because it is not a JSON type — `JSON.stringify` converts it to an ISO
 * string, so the round-trip changes the type from `Date` to `string`; pass
 * `date.toISOString()` explicitly instead.
 *
 * Non-finite numbers (`Infinity`, `-Infinity`, `NaN`) are converted to the
 * strings `"Infinity"`, `"-Infinity"`, and `"NaN"` before crossing the bridge,
 * matching the native Prism SDK behavior.
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

/**
 * Dispatch type for tracking events and views.
 */
export type DispatchType = "event" | "view";

/**
 * Result of a track operation.
 */
export interface TrackResult {
  status: "accepted" | "dropped";
  info: string;
  payload: JsonValueObject;
}
