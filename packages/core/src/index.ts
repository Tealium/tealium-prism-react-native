import NativeTealiumPrismReactNative from "./NativeTealiumPrismReactNative";
import { serialize } from "./serialization";
import type { JsonValue } from "./types";
import { NATIVE_MODULE_NOT_REGISTERED_ERROR } from "./constants";
export { ErrorCode } from "./ErrorCode";

export type {
  JsonValue,
  JsonValueObject,
  DispatchType,
  TrackResult,
  LogLevel,
} from "./types";
export { Environment } from "./types";
export { Tealium } from "./Tealium";

/**
 * Returns the linked Prism SDK version for the current platform.
 *
 * iOS reads from `TealiumConstants.libraryVersion` at runtime.
 * Android reads from the SDK's `BuildConfig.TEALIUM_LIBRARY_VERSION` at runtime.
 */
export function getSdkVersion(): Promise<string> {
  if (!NativeTealiumPrismReactNative) {
    return Promise.reject(new Error(NATIVE_MODULE_NOT_REGISTERED_ERROR));
  }
  return NativeTealiumPrismReactNative.getSdkVersion();
}

// TODO: we should probably remove this as an export once the DataLayer arrives
/**
 * Passes `input` through the native DataItem conversion layer and returns
 * the result. The input is converted to a Prism `DataItem` on the native
 * side and immediately converted back, so the returned value is the JS-visible
 * representation of whatever the native SDK would store.
 *
 * Accepts any JSON value — primitive, array, or object.
 *
 * The value is serialized to a JSON string before crossing the bridge so that
 * `null` values are preserved. The TurboModule bridge drops `null`-valued keys
 * from plain objects on iOS before the native method body runs.
 *
 * Intended for bridge round-trip verification in the example app only.
 */
export function _echoJsonValue(input: JsonValue): Promise<JsonValue> {
  if (!NativeTealiumPrismReactNative) {
    return Promise.reject(new Error(NATIVE_MODULE_NOT_REGISTERED_ERROR));
  }
  return NativeTealiumPrismReactNative.echoJsonValue(serialize(input)).then(
    (result) => {
      try {
        return JSON.parse(result) as JsonValue;
      } catch {
        throw new Error(
          `_echoJsonValue: native returned non-JSON string: ${result}`
        );
      }
    }
  );
}
