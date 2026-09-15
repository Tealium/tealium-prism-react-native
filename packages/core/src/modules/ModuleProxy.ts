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
   * Returns the native module synchronously, applying the same shutdown /
   * registration guard as {@link withNative} (throws `INSTANCE_SHUT_DOWN` or
   * `NATIVE_MODULE_NOT_REGISTERED`). For synchronous, non-Promise entry points
   * such as event subscriptions, where a rejected Promise is not an option.
   */
  getNative(): NativeModule;
}
