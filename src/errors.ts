/**
 * Error codes returned by the Tealium Prism SDK.
 * Use these constants instead of hardcoding strings when handling rejected promises.
 *
 * @example
 * try {
 *   await Tealium.track({ name: 'page_view' });
 * } catch (e) {
 *   if ((e as any).code === ErrorCodes.NOT_INITIALIZED) { ... }
 * }
 */
export const ErrorCodes = {
  /** SDK was not initialized before the call. */
  NOT_INITIALIZED: 'NOT_INITIALIZED',
  /** SDK initialization failed. */
  INIT_ERROR: 'INIT_ERROR',
  /** Track call failed. */
  TRACK_ERROR: 'TRACK_ERROR',
  /** Flush event queue failed. */
  FLUSH_ERROR: 'FLUSH_ERROR',
  /** Data layer operation failed. */
  DATA_LAYER_ERROR: 'DATA_LAYER_ERROR',
  /** Trace operation failed. */
  TRACE_ERROR: 'TRACE_ERROR',
  /** Visitor ID reset failed. */
  RESET_ERROR: 'RESET_ERROR',
  /** Clear stored visitor IDs failed. */
  CLEAR_ERROR: 'CLEAR_ERROR',
  /** Consent API called without a cmpAdapter in config. */
  CONSENT_NOT_ENABLED: 'CONSENT_NOT_ENABLED',
  /** The decisionType string passed to setDecision was not parseable. */
  INVALID_DECISION_TYPE: 'INVALID_DECISION_TYPE',
} as const;

/** Union type of all SDK error codes. */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
