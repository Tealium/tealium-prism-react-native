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
 * Log verbosity level passed to the native Prism SDK.
 *
 * Values map directly to the native SDK's log-level constants on both
 * iOS (`TealiumLogLevel`) and Android (`LogLevel`).
 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "silent";

/**
 * Optional configuration passed to {@link Tealium.create}.
 *
 * Mirrors the settings sources on the native `TealiumConfig`. Every field is
 * optional; an omitted field leaves that source unconfigured on the native SDK.
 *
 * Settings precedence on both platforms is `local < remote < programmatic`, so
 * a key in `settingsUrl` (remote) overrides the same key in `settingsFile`
 * (local), and `logLevel` (programmatic) overrides both.
 */
export interface TealiumConfigOptions {
  /** Log verbosity for the native Prism SDK. */
  logLevel?: LogLevel;
  /**
   * Name of a JSON settings file bundled with the app, providing local
   * (lowest-priority) settings. On iOS this is a resource name in the app's
   * main bundle (the `.json` extension is optional); on Android it is a file
   * name in the `assets/` directory. If the file is missing or invalid, the
   * native SDK skips local settings silently.
   */
  settingsFile?: string;
  /**
   * Full URL of a remote JSON settings resource. When set, the native SDK
   * fetches and caches remote (middle-priority) settings and refreshes them
   * per the configured interval. When omitted, no remote settings are fetched.
   */
  settingsUrl?: string;
}

/**
 * Conventional Prism environment identifiers.
 *
 * `dev`, `qa`, and `prod` are the standard values used by the CDH publishing
 * workflow. Any other string is valid — the native SDKs accept a free-form
 * environment name.
 */
export const Environment = {
  dev: "dev",
  qa: "qa",
  prod: "prod",
} as const;

/**
 * Result of a track operation.
 */
export interface TrackResult {
  status: "accepted" | "dropped";
  info: string;
  payload: JsonValueObject;
}
