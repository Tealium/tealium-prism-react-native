import { getSdkVersion, _echoJsonValue, Tealium, ErrorCode } from "../index";

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

describe("Tealium", () => {
  it("is exported as a class", () => {
    expect(typeof Tealium).toBe("function");
    expect(Tealium.prototype.constructor).toBe(Tealium);
  });

  it("create throws with NATIVE_MODULE_NOT_REGISTERED code when native binding is missing", () => {
    expect(() => Tealium.create("account", "profile", "dev")).toThrow(
      "TealiumPrismReactNative native module is not registered."
    );

    let caught: unknown;
    try {
      Tealium.create("account", "profile", "dev");
    } catch (e) {
      caught = e;
    }
    expect(caught).toMatchObject({
      code: ErrorCode.NATIVE_MODULE_NOT_REGISTERED,
    });
  });

  it("rejects track with NATIVE_MODULE_NOT_REGISTERED code when native binding is missing", async () => {
    const mockInstance = Object.create(Tealium.prototype);
    mockInstance.instanceId = "test-instance";
    mockInstance._isShutdown = false;

    await expect(mockInstance.track("event_name")).rejects.toMatchObject({
      code: ErrorCode.NATIVE_MODULE_NOT_REGISTERED,
    });
  });

  it("rejects shutdown with NATIVE_MODULE_NOT_REGISTERED code when native binding is missing", async () => {
    const mockInstance = Object.create(Tealium.prototype);
    mockInstance.instanceId = "test-instance";
    mockInstance._isShutdown = false;

    await expect(mockInstance.shutdown()).rejects.toMatchObject({
      code: ErrorCode.NATIVE_MODULE_NOT_REGISTERED,
    });
  });
});
