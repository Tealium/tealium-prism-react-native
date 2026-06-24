import NativeTealiumPrismReactNative from "./NativeTealiumPrismReactNative";
import type { JsonValue } from "./types";

export type { JsonValue, JsonValueObject } from "./types";

/**
 * Returns the linked Prism SDK version for the current platform.
 *
 * iOS reads from `TealiumConstants.libraryVersion` at runtime.
 * Android reads from the SDK's `BuildConfig.TEALIUM_LIBRARY_VERSION` at runtime.
 */
export function getSdkVersion(): Promise<string> {
  if (!NativeTealiumPrismReactNative) {
    return Promise.reject(
      new Error("TealiumPrismReactNative native module is not registered.")
    );
  }
  return NativeTealiumPrismReactNative.getSdkVersion();
}

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
export function echoJsonValue(input: JsonValue): Promise<JsonValue> {
  if (!NativeTealiumPrismReactNative) {
    return Promise.reject(
      new Error("TealiumPrismReactNative native module is not registered.")
    );
  }
  return NativeTealiumPrismReactNative.echoJsonValue(
    JSON.stringify(input)
  ).then((result) => JSON.parse(result) as JsonValue);
}
