// Shared TypeScript types for the bridge data contract.
// Most of these are compile-time-only types. `Environment` is a runtime constant.

/**
 * Any JSON-serializable value that can cross the React Native bridge.
 *
 * The type is named `JsonValue` instead of `DataItem` to avoid a clash with the
 * native Prism `DataItem` wrapper.
 *
 * Only JSON-native types are valid: strings, numbers, booleans, `null`, arrays,
 * and plain objects. Functions, `undefined`, `Symbol`, and `BigInt` are not
 * JSON-serializable. `null` is a valid value. It maps to `NSNull()` on iOS and
 * to `DataItem.NULL` on Android.
 *
 * `Date` is not a JSON type. `JSON.stringify` converts it to an ISO string, so
 * the value changes from `Date` to `string`. Pass `date.toISOString()` instead.
 *
 * Non-finite numbers (`Infinity`, `-Infinity`, and `NaN`) become the strings
 * `"Infinity"`, `"-Infinity"`, and `"NaN"` before they cross the bridge. This
 * matches the native Prism SDK behavior.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * A JSON object. It maps to the native SDK `DataObject`.
 *
 * @example
 * ```ts
 * const data: JsonValueObject = { customer_id: "1234567890", is_member: true };
 * ```
 */
export type JsonValueObject = Record<string, JsonValue>;

/**
 * Dispatch type for {@link Tealium.track}.
 *
 * Use `"event"` for an action such as a button tap. Use `"view"` for a screen
 * view.
 */
export type DispatchType = "event" | "view";

/**
 * Log verbosity of the native Prism SDK, set with {@link Tealium.create}.
 *
 * The levels run from most to least verbose: `"trace"`, `"debug"`, `"info"`,
 * `"warn"`, `"error"`, and `"silent"`. The SDK logs messages at the chosen level
 * and above. `"silent"` turns logging off.
 *
 * The values map directly to the log levels of the native SDK on iOS
 * (`LogLevel.Minimum`) and Android (`LogLevel`).
 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "silent";

/**
 * Conventional Prism environment names.
 *
 * `dev`, `qa`, and `prod` are the environments of a standard Tealium profile.
 * The mobile settings publisher supports only these three. Any other string is
 * also valid, because the native SDKs accept a free-form environment name.
 *
 * @example
 * ```ts
 * Tealium.create("my_account", "my_profile", Environment.prod);
 * ```
 */
export const Environment = {
  /** Development environment. */
  dev: "dev",
  /** Quality assurance environment. */
  qa: "qa",
  /** Production environment. */
  prod: "prod",
} as const;

/**
 * Result of a track call, reported by the native Prism SDK.
 */
export interface TrackResult {
  /** Whether the SDK accepted the dispatch or dropped it. */
  status: "accepted" | "dropped";
  /** Human-readable reason behind the status decision. */
  info: string;
  /**
   * The dispatch payload after the SDK collected, transformed, and applied
   * consent to it.
   */
  payload: JsonValueObject;
}

/**
 * Expiry of a data layer entry, mirroring the native Prism `Expiry` accepted
 * by `DataLayer.put`. `"forever"` never expires, `"session"` expires when the
 * session ends, `"untilRestart"` expires when the app restarts, and a `Date`
 * expires at that absolute point in time.
 */
export type Expiry = "session" | "untilRestart" | "forever" | Date;
