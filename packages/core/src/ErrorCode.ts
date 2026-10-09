// Generated from error-codes.json — do not edit manually
/**
 * Machine-readable codes for errors raised by the wrapper or the native SDK.
 *
 * Compare {@link TealiumError.code} against these values.
 */
export const ErrorCode = {
  /** A JSON string that crossed the bridge could not be parsed. */
  DATA_PARSE_ERROR: "DATA_PARSE_ERROR",
  /** The native module has no instance for the given instance ID. */
  INSTANCE_NOT_FOUND: "INSTANCE_NOT_FOUND",
  /** The instance was shut down. Call `Tealium.create` to get a new instance. */
  INSTANCE_SHUT_DOWN: "INSTANCE_SHUT_DOWN",
  /** The native module is not available in the running app. Rebuild the native app after installing the package. */
  NATIVE_MODULE_NOT_REGISTERED: "NATIVE_MODULE_NOT_REGISTERED",
  /** The native Prism SDK reported a failure. The error message comes from the native SDK. */
  PRISM_NATIVE_ERROR: "PRISM_NATIVE_ERROR",
  /** The native operation completed without producing a result. */
  TEALIUM_CANCELLED: "TEALIUM_CANCELLED",
} as const;
