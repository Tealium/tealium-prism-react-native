import { getSdkVersion, _echoJsonValue } from "../index";

// In the Jest (JS-only) environment no native TurboModule is registered, so
// calling getSdkVersion() throws (NativeModule is null). This guards the
// contract that the function is exported and callable. End-to-end version
// string verification happens in the example app on a real iOS/Android build.
describe("getSdkVersion", () => {
  it("is exported as a function", () => {
    expect(typeof getSdkVersion).toBe("function");
  });

  it("rejects when no native binding is registered", async () => {
    await expect(getSdkVersion()).rejects.toThrow();
  });
});

describe("_echoJsonValue", () => {
  it("is exported as a function", () => {
    expect(typeof _echoJsonValue).toBe("function");
  });

  it("rejects when no native binding is registered", async () => {
    await expect(_echoJsonValue(42)).rejects.toThrow();
  });
});
