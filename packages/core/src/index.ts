import NativeTealiumPrismReactNative from "./NativeTealiumPrismReactNative";

/**
 * Returns the linked Prism SDK version for the current platform.
 *
 * iOS reads from `TealiumConstants.libraryVersion` at runtime.
 * Android reads from the SDK's `BuildConfig.TEALIUM_LIBRARY_VERSION` at runtime.
 * The resolved field (`ios` or `android`) will be non-empty when the SDK is
 * correctly linked; the other field is absent.
 */
export function getSdkVersion(): Promise<{ ios?: string; android?: string }> {
  return NativeTealiumPrismReactNative!.getSdkVersion();
}
