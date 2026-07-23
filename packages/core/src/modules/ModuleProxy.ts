import type NativeTealiumPrismReactNative from "../NativeTealiumPrismReactNative";
import type { TrackResult } from "../types";

/** The registered native TurboModule, in its non-null form. */
export type NativeModule = NonNullable<typeof NativeTealiumPrismReactNative>;

/**
 * Internal handle the core ({@link Tealium}) hands to each sub-module (Trace
 * today; DataLayer and others later). Mirrors the native `moduleProxy` passed
 * into module wrappers in the Prism SDKs. It bundles the instance id and the
 * shutdown-aware dispatch helpers so a module never touches the native binding
 * or the shutdown flag directly. Not exported from the package barrel.
 */
export interface ModuleProxy {
  readonly instanceId: string;
  withNative<T>(action: (native: NativeModule) => Promise<T>): Promise<T>;
  parseTrackResult(resultJson: string, context: string): TrackResult;
}
