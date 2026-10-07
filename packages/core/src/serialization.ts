import type { TrackResult } from "./types";
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
 * Parses a {@link TrackResult} JSON string returned by a native method, the
 * deserialization counterpart to {@link serialize}. Throws a
 * {@link ErrorCode.DATA_PARSE_ERROR} tagged with {@link context} if the string
 * is not valid JSON.
 */
export function parseTrackResult(
  resultJson: string,
  context: string
): TrackResult {
  try {
    return JSON.parse(resultJson) as TrackResult;
  } catch {
    throw tealiumError(ErrorCode.DATA_PARSE_ERROR, context, resultJson);
  }
}
