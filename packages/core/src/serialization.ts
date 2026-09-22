import type { ExpiryPolicy, JsonValue, TrackResult } from "./types";
import { ErrorCode } from "./ErrorCode";
import { tealiumError } from "./errors";

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "NaN";
    if (value === Infinity) return "Infinity";
    if (value === -Infinity) return "-Infinity";
  }
  return value;
}

/**
 * Serializes a value to a JSON string, converting non-finite numbers
 * (`NaN`, `Infinity`, `-Infinity`) to their string representations to match
 * native Prism SDK behavior.
 */
export function serialize(value: unknown): string {
  const result = JSON.stringify(value, jsonReplacer);
  if (result === undefined) {
    throw new Error(
      `serialize: value is not JSON-serializable (type: ${typeof value})`
    );
  }
  return result;
}

/**
 * Parses a JSON string returned by a native method into a {@link JsonValue},
 * the deserialization counterpart to {@link serialize}. Throws a
 * {@link ErrorCode.DATA_PARSE_ERROR} tagged with {@link context} if the string
 * is not valid JSON.
 */
export function parseJsonValue(json: string, context: string): JsonValue {
  try {
    return JSON.parse(json) as JsonValue;
  } catch {
    throw tealiumError(ErrorCode.DATA_PARSE_ERROR, context, json);
  }
}

/**
 * Parses a {@link TrackResult} JSON string returned by a native method.
 * Delegates to {@link parseJsonValue} for the shared
 * {@link ErrorCode.DATA_PARSE_ERROR} handling.
 */
export function parseTrackResult(
  resultJson: string,
  context: string
): TrackResult {
  return parseJsonValue(resultJson, context) as unknown as TrackResult;
}

/**
 * Encodes an {@link ExpiryPolicy} to the integer sentinel the native bridge
 * expects: `"forever"` → `-1`, `"session"` → `-2`, `"untilRestart"` → `-3`,
 * `{ afterSeconds }` → the seconds value unchanged (no validation or
 * coercion — an unconvertible value falls back to the native side's default,
 * forever), and `undefined` → `null` (native defaults to forever).
 */
export function encodeExpiryPolicy(
  expiry: ExpiryPolicy | undefined
): number | null {
  if (expiry === undefined) return null;
  if (expiry === "forever") return -1;
  if (expiry === "session") return -2;
  if (expiry === "untilRestart") return -3;
  return expiry.afterSeconds;
}
