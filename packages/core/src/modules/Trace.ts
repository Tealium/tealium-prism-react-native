import type { ModuleProxy } from "./ModuleProxy";
import type { TrackResult } from "../types";
import { parseTrackResult } from "../serialization";

/**
 * Trace controls: join a trace, leave it, or force the end of the current
 * visit. Mirrors the native Prism `Trace` module (prism-swift `Trace` protocol,
 * prism-kotlin `Trace` interface). Reached via {@link Tealium.trace}.
 */
export class Trace {
  /** @internal Constructed by {@link Tealium}; not part of the public API. */
  constructor(private readonly proxy: ModuleProxy) {}

  /**
   * Joins a trace for the given id. The trace id is added to every subsequent
   * dispatch until {@link leave} is called or the session expires.
   */
  join(id: string): Promise<void> {
    return this.proxy.withNative((native) =>
      native.joinTrace(this.proxy.instanceId, id)
    );
  }

  /** Leaves the current trace, if one has been joined. */
  leave(): Promise<void> {
    return this.proxy.withNative((native) =>
      native.leaveTrace(this.proxy.instanceId)
    );
  }

  /**
   * Forces the end of the current visit. Dispatches a kill-session event and
   * resolves with its {@link TrackResult}. Rejects if no trace is joined.
   */
  forceEndOfVisit(): Promise<TrackResult> {
    return this.proxy.withNative((native) =>
      native
        .forceEndOfVisit(this.proxy.instanceId)
        .then((resultJson) =>
          parseTrackResult(resultJson, "Tealium.trace.forceEndOfVisit")
        )
    );
  }
}
