/**
 * TraceAPI - Interface for Tealium trace/debugging functionality
 *
 * Mirrors the native Trace API from Swift/Kotlin SDKs.
 * Used for debugging and validating events in Tealium's Event Stream Live.
 */

import NativeTealiumPrism from '../NativeTealiumPrismReactNative';

/**
 * TraceAPI provides methods for joining and leaving trace sessions.
 *
 * Joining a trace adds the trace ID to each event for server-side filtering
 * in Tealium's Event Stream Live debugging tool.
 *
 * @example
 * ```typescript
 * // Join a trace session
 * Tealium.trace.join('abc123');
 *
 * // ... track events ...
 *
 * // Force end of visit (optional)
 * Tealium.trace.forceEndOfVisit();
 *
 * // Leave the trace
 * Tealium.trace.leave();
 * ```
 */
export class TraceAPI {
  /**
   * Join a trace session with the specified trace ID.
   *
   * The trace ID will be added to all future events until either
   * `leave()` is called or the session expires.
   *
   * @param id - The trace ID to join (from Tealium's Event Stream Live)
   *
   * @example
   * ```typescript
   * Tealium.trace.join('abc123');
   * ```
   */
  join(id: string): void {
    NativeTealiumPrism.traceJoin(id);
  }

  /**
   * Leave the current trace session.
   *
   * Stops adding the trace ID to future events.
   */
  leave(): void {
    NativeTealiumPrism.traceLeave();
  }

  /**
   * Force end of the current visitor session while remaining in trace mode.
   *
   * This triggers end-of-visit processing in Tealium, useful for testing
   * visit-level calculations and audiences.
   *
   * The trace will remain active until `leave()` is called.
   */
  forceEndOfVisit(): void {
    NativeTealiumPrism.traceForceEndOfVisit();
  }
}
