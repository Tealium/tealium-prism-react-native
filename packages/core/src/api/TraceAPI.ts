/**
 * TraceAPI - Interface for Tealium trace/debugging functionality
 *
 * Mirrors the native Trace API from Swift/Kotlin SDKs.
 * Used for debugging and validating events in Tealium's Event Stream Live.
 */

import NativeTealiumPrism from '../NativeTealiumPrismReactNative';
import type { TrackResultSpec } from '../NativeTealiumPrismReactNative';
import type { TrackResult } from '../types';

export class TraceAPI {
  /**
   * Join a trace session with the specified trace ID.
   *
   * The trace ID will be added to all future events until either
   * `leave()` is called or the session expires.
   *
   * @param id - The trace ID to join (from Tealium's Event Stream Live)
   * @returns Promise resolving when the trace is joined. Rejects with
   *   `TRACE_ERROR` on native failure or `NOT_INITIALIZED` (Android) /
   *   `TRACE_ERROR` (iOS) if Tealium is not yet initialized.
   *
   * @example
   * ```typescript
   * Tealium.trace.join('abc123');
   * ```
   */
  join(id: string): Promise<void> {
    return NativeTealiumPrism.traceJoin(id);
  }

  /**
   * Leave the current trace session.
   *
   * Stops adding the trace ID to future events.
   *
   * @returns Promise resolving when trace is left. Rejects with `TRACE_ERROR`
   *   on native failure or `NOT_INITIALIZED` (Android) / `TRACE_ERROR` (iOS)
   *   if Tealium is not yet initialized.
   */
  leave(): Promise<void> {
    return NativeTealiumPrism.traceLeave();
  }

  /**
   * Force end of the current visitor session while remaining in trace mode.
   *
   * This triggers end-of-visit processing in Tealium, useful for testing
   * visit-level calculations and audiences.
   *
   * The trace will remain active until `leave()` is called.
   *
   * @returns Promise resolving with the TrackResult for the end-of-visit
   *   dispatch. Rejects with `TRACE_ERROR` on native failure or
   *   `NOT_INITIALIZED` if Tealium is not yet initialized.
   */
  async forceEndOfVisit(): Promise<TrackResult> {
    const spec: TrackResultSpec =
      await NativeTealiumPrism.traceForceEndOfVisit();
    return {
      status: spec.status === 'accepted' ? 'accepted' : 'dropped',
      info: spec.info,
      dispatch: {
        id: spec.dispatch.id,
        timestamp: spec.dispatch.timestamp,
        payload: spec.dispatch.payload as Record<string, unknown>,
      },
    };
  }
}
