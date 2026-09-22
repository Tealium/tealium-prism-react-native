import { encodeExpiryPolicy, serialize } from "../serialization";
import type { ExpiryPolicy } from "../types";

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

describe("encodeExpiryPolicy", () => {
  const cases: Array<[ExpiryPolicy | undefined, number | null]> = [
    ["forever", -1],
    ["session", -2],
    ["untilRestart", -3],
    [{ afterSeconds: 90 }, 90],
    [{ afterSeconds: 1.5 }, 1.5],
    [{ afterSeconds: -7 }, -7],
    [undefined, null],
  ];

  it.each(cases)("encodes %j to %s", (expiry, encoded) => {
    expect(encodeExpiryPolicy(expiry)).toBe(encoded);
  });
});
