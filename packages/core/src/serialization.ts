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
  return JSON.stringify(value, jsonReplacer);
}
