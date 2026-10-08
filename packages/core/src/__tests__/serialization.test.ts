import { encodeExpiry, serialize } from "../serialization";
import type { Expiry } from "../types";

describe("serialize", () => {
  it("passes through a string", () => {
    expect(serialize("hello")).toBe('"hello"');
  });

  it("passes through a finite number", () => {
    expect(serialize(42)).toBe("42");
    expect(serialize(-3.14)).toBe("-3.14");
    expect(serialize(0)).toBe("0");
  });

  it("passes through a boolean", () => {
    expect(serialize(true)).toBe("true");
    expect(serialize(false)).toBe("false");
  });

  it("passes through null", () => {
    expect(serialize(null)).toBe("null");
  });

  it('converts NaN to string "NaN"', () => {
    expect(serialize(NaN)).toBe('"NaN"');
  });

  it('converts Infinity to string "Infinity"', () => {
    expect(serialize(Infinity)).toBe('"Infinity"');
  });

  it('converts -Infinity to string "-Infinity"', () => {
    expect(serialize(-Infinity)).toBe('"-Infinity"');
  });

  it("converts nested NaN in an object", () => {
    expect(serialize({ val: NaN })).toBe('{"val":"NaN"}');
  });

  it("converts nested Infinity in an object", () => {
    expect(serialize({ val: Infinity })).toBe('{"val":"Infinity"}');
  });

  it("converts nested -Infinity in an object", () => {
    expect(serialize({ val: -Infinity })).toBe('{"val":"-Infinity"}');
  });

  it("converts non-finite values inside an array", () => {
    expect(serialize([NaN, Infinity, -Infinity, 1])).toBe(
      '["NaN","Infinity","-Infinity",1]'
    );
  });

  it("converts non-finite values in deeply nested structures", () => {
    expect(serialize({ a: { b: [NaN, { c: Infinity }] } })).toBe(
      '{"a":{"b":["NaN",{"c":"Infinity"}]}}'
    );
  });

  it("preserves finite numbers alongside non-finite ones", () => {
    expect(serialize({ x: 1, y: NaN, z: -2.5 })).toBe(
      '{"x":1,"y":"NaN","z":-2.5}'
    );
  });

  it("throws for undefined", () => {
    expect(() => serialize(undefined)).toThrow(
      "serialize: value is not JSON-serializable (type: undefined)"
    );
  });

  it("throws for a function", () => {
    expect(() => serialize(() => {})).toThrow(
      "serialize: value is not JSON-serializable (type: function)"
    );
  });

  it("throws for a symbol", () => {
    expect(() => serialize(Symbol("s"))).toThrow(
      "serialize: value is not JSON-serializable (type: symbol)"
    );
  });
});

describe("encodeExpiry", () => {
  const cases: Array<[string, Expiry | undefined, number | null]> = [
    ["forever", "forever", -1],
    ["session", "session", -2],
    ["untilRestart", "untilRestart", -3],
    ["a date", new Date(1_700_000_000_123), 1_700_000_000_123],
    ["the Unix epoch", new Date(0), 0],
    ["undefined", undefined, null],
  ];

  cases.forEach(([label, expiry, encoded]) => {
    it(`encodes ${label} to ${encoded}`, () => {
      expect(encodeExpiry(expiry)).toBe(encoded);
    });
  });

  it("throws for an invalid date", () => {
    expect(() => encodeExpiry(new Date(Number.NaN))).toThrow(
      "encodeExpiry: invalid Date (NaN time)"
    );
  });
});
