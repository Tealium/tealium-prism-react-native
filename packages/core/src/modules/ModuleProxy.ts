import type NativeTealiumPrismReactNative from "../NativeTealiumPrismReactNative";

/** The registered native TurboModule, in its non-null form. */
export type NativeModule = NonNullable<typeof NativeTealiumPrismReactNative>;

/**
 * Generic handle {@link Tealium} hands to each sub-module, mirroring the native
 * `moduleProxy`. Bundles the instance id and shutdown-aware dispatch so a module
 * never touches the native binding or shutdown flag directly. Module-specific
 * concerns (e.g. track-result parsing) stay in their own helpers.
 */
export interface ModuleProxy {
  readonly instanceId: string;
  withNative<T>(action: (native: NativeModule) => Promise<T>): Promise<T>;
  /**
   * Like {@link withNative}, for native methods whose result carries no
   * payload. They resolve the JSON string `"null"`: the SDK emits `Void`, which
   * the native bridge (this repo's promise adapters) encodes as a null
   * `DataItem`. This discards it and resolves `undefined` so the wrapper method
   * honors its `Promise<void>` contract.
   */
  withNativeVoid(
    action: (native: NativeModule) => Promise<unknown>
  ): Promise<void>;
}
