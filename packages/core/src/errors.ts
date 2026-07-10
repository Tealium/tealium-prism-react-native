import { ErrorCode } from "./ErrorCode";

export type TealiumErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface TealiumError extends Error {
  code: TealiumErrorCode;
}

type TealiumErrorParams = {
  NATIVE_MODULE_NOT_REGISTERED: [];
  INSTANCE_SHUT_DOWN: [instanceId: string];
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

export function tealiumError<C extends keyof TealiumErrorParams>(
  code: C,
  ...args: TealiumErrorParams[C]
): TealiumError {
  const message = ErrorMessages[code](...args);
  return createTealiumError(code, message);
}
