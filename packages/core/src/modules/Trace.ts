import type { ModuleProxy } from "./ModuleProxy";
import type { TrackResult } from "../types";
import { parseTrackResult } from "../serialization";

/**
 * Trace controls: join a trace, leave it, or force the end of the current
 * visit. Mirrors the native Prism `Trace` module. Reach it with
 * {@link Tealium.trace}.
 *
 * The Trace module runs only when your Tealium settings configure it. Without
 * it, every method rejects.
 *
 * Every method rejects with a {@link TealiumError} if the instance is shut
 * down or the native SDK reports a failure.
 *
 * @example
 * ```ts
 * await tealium.trace.join("12345");
 * await tealium.track("trace_demo_event");
 * await tealium.trace.leave();
 * ```
 */
export class Trace {
  /** @internal Constructed by {@link Tealium}; not part of the public API. */
  constructor(private readonly proxy: ModuleProxy) {}

  /**
   * Joins a trace. The SDK adds the trace ID to every later dispatch until you
   * call {@link Trace.leave} or the session expires.
   *
   * @param id - Trace ID to join.
   * @returns A Promise that resolves after the SDK joins the trace.
   */
  join(id: string): Promise<void> {
    return this.proxy
      .withNative((native) => native.joinTrace(this.proxy.instanceId, id))
      .then(() => undefined);
  }

  /**
   * Leaves the current trace. Does nothing if no trace is joined.
   *
   * @returns A Promise that resolves after the SDK leaves the trace.
   */
  leave(): Promise<void> {
    return this.proxy
      .withNative((native) => native.leaveTrace(this.proxy.instanceId))
      .then(() => undefined);
  }

  /**
   * Forces the end of the current visit. The SDK dispatches a kill-session
   * event. The trace stays active until you call {@link Trace.leave}.
   *
   * @returns A Promise that resolves with the {@link TrackResult} of the
   *   kill-session event. Like any track call, the SDK can accept or drop it.
   *   The Promise rejects if no trace is joined.
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
