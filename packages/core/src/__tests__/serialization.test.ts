import { serialize } from "../serialization";

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
});
