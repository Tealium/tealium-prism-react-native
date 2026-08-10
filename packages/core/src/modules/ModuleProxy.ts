import type NativeTealiumPrismReactNative from "../NativeTealiumPrismReactNative";

/** The registered native TurboModule, in its non-null form. */
export type NativeModule = NonNullable<typeof NativeTealiumPrismReactNative>;

/**
 * Generic handle {@link Tealium} hands to each sub-module (Trace today;
 * DataLayer and others later), mirroring the native `moduleProxy`. Bundles the
 * instance id and shutdown-aware dispatch so a module never touches the native
 * binding or shutdown flag directly. Module-specific concerns (e.g. track-result
 * parsing) stay in their own helpers. Not exported from the barrel.
 */
export interface ModuleProxy {
  readonly instanceId: string;
  withNative<T>(action: (native: NativeModule) => Promise<T>): Promise<T>;
}
