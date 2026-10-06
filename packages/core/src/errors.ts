import { ErrorCode } from "./ErrorCode";

/**
 * Union of the string values of {@link ErrorCode}.
 */
export type TealiumErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Error thrown or used to reject a Promise by this package.
 *
 * Errors from the native SDK carry the same `code` property.
 *
 * @example
 * ```ts
 * try {
 *   await tealium.track("checkout_started");
 * } catch (error) {
 *   if ((error as TealiumError).code === ErrorCode.INSTANCE_SHUT_DOWN) {
 *     // Create a new instance before tracking again.
 *   }
 * }
 * ```
 */
export interface TealiumError extends Error {
  /** Machine-readable error code. Compare it against {@link ErrorCode}. */
  code: TealiumErrorCode;
}

/**
 * Message arguments of each error code that the JavaScript layer raises, keyed
 * by code. See {@link tealiumError}.
 */
type TealiumErrorParams = {
  /** Takes no arguments. */
  NATIVE_MODULE_NOT_REGISTERED: [];
  /** Takes the ID of the shut-down instance. */
  INSTANCE_SHUT_DOWN: [instanceId: string];
  /** Takes the name of the failing call and the raw value that did not parse. */
  DATA_PARSE_ERROR: [context: string, rawValue: string];
};

const ErrorMessages: {
  [C in keyof TealiumErrorParams]: (...args: TealiumErrorParams[C]) => string;
} = {
  NATIVE_MODULE_NOT_REGISTERED: () =>
    "TealiumPrismReactNative native module is not registered.",
  INSTANCE_SHUT_DOWN: (instanceId) =>
    `Tealium instance "${instanceId}" has been shut down.`,
  DATA_PARSE_ERROR: (context, rawValue) =>
    `${context}: native returned non-JSON string: ${rawValue}`,
};

export function createTealiumError(
  code: TealiumErrorCode,
  message: string
): TealiumError {
  const error = new Error(message) as TealiumError;
  error.code = code;
  return error;
}

/**
 * Creates a {@link TealiumError} with the standard message for an error code
 * that the JavaScript layer raises.
 *
 * @param code - One of `NATIVE_MODULE_NOT_REGISTERED`, `INSTANCE_SHUT_DOWN`, or
 *   `DATA_PARSE_ERROR`.
 * @param args - Message arguments of the code. `NATIVE_MODULE_NOT_REGISTERED`
 *   takes none. `INSTANCE_SHUT_DOWN` takes the instance ID. `DATA_PARSE_ERROR`
 *   takes a context string and the raw value.
 * @returns The error, with `code` set.
 */
export function tealiumError<C extends keyof TealiumErrorParams>(
  code: C,
  ...args: TealiumErrorParams[C]
): TealiumError {
  const message = ErrorMessages[code](...args);
  return createTealiumError(code, message);
}
