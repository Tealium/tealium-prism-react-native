import type { ModuleProxy } from "./ModuleProxy";

/**
 * Visitor ID controls: reset the anonymous visitor id, or clear the stored
 * identity-linked id history and reset. Mirrors the native Prism core visitor-id
 * calls (prism-swift/prism-kotlin `Tealium.resetVisitorId` /
 * `clearStoredVisitorIds`), which live flat on the instance and are always
 * available (no module registration). Reached via {@link Tealium.visitorId}.
 *
 * Both methods resolve with the NEW visitor id. The native layer returns the id
 * as a raw string (not JSON-encoded), so no parsing happens JS-side.
 */
export class VisitorId {
  /** @internal Constructed by {@link Tealium}; not part of the public API. */
  constructor(private readonly proxy: ModuleProxy) {}

  /** Regenerates the anonymous visitor id. Resolves with the new id. */
  reset(): Promise<string> {
    return this.proxy.withNative((native) =>
      native.resetVisitorId(this.proxy.instanceId)
    );
  }

  /**
   * Clears the stored history of identity-linked ids and regenerates the
   * anonymous visitor id. Resolves with the new id.
   */
  clearStored(): Promise<string> {
    return this.proxy.withNative((native) =>
      native.clearStoredVisitorIds(this.proxy.instanceId)
    );
  }
}
