import type { ModuleProxy } from "./ModuleProxy";
import { parseJsonValue } from "../serialization";

/**
 * Visitor ID controls. Mirrors the native Prism `VisitorIdManager` (Swift/Kotlin
 * `Tealium.visitorId`), backed by the Prism SDK's `VisitorId` module.
 * Reach it with {@link Tealium.visitorId}.
 *
 * The VisitorId module is registered and enabled by default, but your Tealium
 * settings can disable it. While disabled, every method rejects with
 * {@link ErrorCode.PRISM_NATIVE_ERROR} — that behavior comes from the Prism
 * SDK; the bridge only forwards the failure.
 *
 * Visitor switching is configured through the module's `visitor_identity_key`
 * in your local/remote settings JSON.
 */
export class VisitorIdManager {
  /** @internal Constructed by {@link Tealium}; not part of the public API. */
  constructor(private readonly proxy: ModuleProxy) {}

  /** Resolves with the visitor ID at the time of the call. */
  current(): Promise<string> {
    return this.proxy.withNative((native) =>
      native
        .getVisitorId(this.proxy.instanceId)
        .then(
          (json) => parseJsonValue(json, "Tealium.visitorId.current") as string
        )
    );
  }

  /**
   * Generates a new anonymous visitor ID and resolves with it.
   *
   * Stored identity associations are left untouched. If an identity is present
   * in the data layer, it takes ownership of the new ID; otherwise the new ID
   * stays unowned until the next identity is written.
   *
   * **Important:** to keep events in the anonymous gap from being attributed to
   * the previous identity, remove the identity key from the data layer
   * **before** calling this method. Calling it while the identity is still
   * present rebinds that identity to the new ID.
   *
   * Rejects with {@link ErrorCode.PRISM_NATIVE_ERROR} when the VisitorId module
   * is disabled, or when the new ID can't be stored. In the storage case the
   * Prism SDK still uses the new ID for events until the app relaunches, then
   * restores the previous one.
   */
  regenerate(): Promise<string> {
    return this.proxy.withNative((native) =>
      native
        .regenerateVisitorId(this.proxy.instanceId)
        .then(
          (json) =>
            parseJsonValue(json, "Tealium.visitorId.regenerate") as string
        )
    );
  }

  /**
   * Erases every identity association stored on this device, then generates
   * a new visitor ID and resolves with it.
   *
   * If an identity is present in the data layer, the Prism SDK immediately
   * associates it with the new ID, so one new association may remain. Remove
   * the identity key from the data layer first to leave none.
   *
   * This is a device-only operation: it doesn't remove the identity from the
   * data layer or change server-side visitor profiles.
   *
   * Rejects with {@link ErrorCode.PRISM_NATIVE_ERROR} when the VisitorId module
   * is disabled, or when the erasure can't be stored. In the storage case
   * nothing is erased, but the Prism SDK still uses the new ID for events until
   * the app relaunches, then restores the previous ID and every association.
   */
  eraseLocalHistory(): Promise<string> {
    return this.proxy.withNative((native) =>
      native
        .eraseVisitorIdLocalHistory(this.proxy.instanceId)
        .then(
          (json) =>
            parseJsonValue(
              json,
              "Tealium.visitorId.eraseLocalHistory"
            ) as string
        )
    );
  }
}
