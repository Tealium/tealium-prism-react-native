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
export class VisitorId {
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
   * Generates a new anonymous visitor ID and resolves with it. The new id
   * stays associated with the owning identity, if any.
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
