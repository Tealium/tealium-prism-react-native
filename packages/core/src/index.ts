import NativeTealiumPrismReactNative from "./NativeTealiumPrismReactNative";

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
