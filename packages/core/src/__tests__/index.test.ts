import { getSdkVersion, _echoJsonValue, Tealium, ErrorCode } from "../index";

// In the Jest (JS-only) environment no native TurboModule is registered, so
// calling getSdkVersion() throws (NativeModule is null). This guards the
// contract that the function is exported and callable. End-to-end version
// string verification happens in the example app on a real iOS/Android build.
describe("getSdkVersion", () => {
  it("is exported as a function", () => {
    expect(typeof getSdkVersion).toBe("function");
  });

  it("rejects with NATIVE_MODULE_NOT_REGISTERED code when native binding is missing", async () => {
    await expect(getSdkVersion()).rejects.toMatchObject({
      code: ErrorCode.NATIVE_MODULE_NOT_REGISTERED,
      message: "TealiumPrismReactNative native module is not registered.",
    });
  });
});

describe("_echoJsonValue", () => {
  it("is exported as a function", () => {
    expect(typeof _echoJsonValue).toBe("function");
  });

  it("rejects with NATIVE_MODULE_NOT_REGISTERED code when native binding is missing", async () => {
    await expect(_echoJsonValue(42)).rejects.toMatchObject({
      code: ErrorCode.NATIVE_MODULE_NOT_REGISTERED,
      message: "TealiumPrismReactNative native module is not registered.",
    });
  });
});

describe("Tealium", () => {
  it("is exported as a class", () => {
    expect(typeof Tealium).toBe("function");
    expect(Tealium.prototype.constructor).toBe(Tealium);
  });

  it("create throws with NATIVE_MODULE_NOT_REGISTERED code when native binding is missing", () => {
    expect(() => Tealium.create("account", "profile", "dev")).toThrow(
      expect.objectContaining({
        code: ErrorCode.NATIVE_MODULE_NOT_REGISTERED,
        message: "TealiumPrismReactNative native module is not registered.",
      })
    );
  });

  it("rejects track with INSTANCE_SHUT_DOWN code when instance has been shut down", async () => {
    const mockInstance = Object.create(Tealium.prototype);
    mockInstance.instanceId = "test-instance";
    mockInstance._isShutdown = true;

    await expect(mockInstance.track("event_name")).rejects.toMatchObject({
      code: ErrorCode.INSTANCE_SHUT_DOWN,
      message: 'Tealium instance "test-instance" has been shut down.',
    });
  });

  it("rejects track with NATIVE_MODULE_NOT_REGISTERED code when native binding is missing", async () => {
    const mockInstance = Object.create(Tealium.prototype);
    mockInstance.instanceId = "test-instance";
    mockInstance._isShutdown = false;

    await expect(mockInstance.track("event_name")).rejects.toMatchObject({
      code: ErrorCode.NATIVE_MODULE_NOT_REGISTERED,
      message: "TealiumPrismReactNative native module is not registered.",
    });
  });

  it("rejects shutdown with NATIVE_MODULE_NOT_REGISTERED code when native binding is missing", async () => {
    const mockInstance = Object.create(Tealium.prototype);
    mockInstance.instanceId = "test-instance";
    mockInstance._isShutdown = false;

    await expect(mockInstance.shutdown()).rejects.toMatchObject({
      code: ErrorCode.NATIVE_MODULE_NOT_REGISTERED,
      message: "TealiumPrismReactNative native module is not registered.",
    });
  });

  // Trace API (joinTrace / leaveTrace / forceEndOfVisit) shares the same guard
  // contract as track/shutdown. End-to-end trace-id-on-payload verification
  // happens in native tests and the example app.
  const traceMethods: Array<[string, (i: Tealium) => Promise<unknown>]> = [
    ["joinTrace", (i) => i.joinTrace("trace-123")],
    ["leaveTrace", (i) => i.leaveTrace()],
    ["forceEndOfVisit", (i) => i.forceEndOfVisit()],
  ];

  describe.each(traceMethods)("%s", (_name, call) => {
    it("rejects with INSTANCE_SHUT_DOWN code when instance has been shut down", async () => {
      const mockInstance = Object.create(Tealium.prototype);
      mockInstance.instanceId = "test-instance";
      mockInstance._isShutdown = true;

      await expect(call(mockInstance)).rejects.toMatchObject({
        code: ErrorCode.INSTANCE_SHUT_DOWN,
        message: 'Tealium instance "test-instance" has been shut down.',
      });
    });

    it("rejects with NATIVE_MODULE_NOT_REGISTERED code when native binding is missing", async () => {
      const mockInstance = Object.create(Tealium.prototype);
      mockInstance.instanceId = "test-instance";
      mockInstance._isShutdown = false;

      await expect(call(mockInstance)).rejects.toMatchObject({
        code: ErrorCode.NATIVE_MODULE_NOT_REGISTERED,
        message: "TealiumPrismReactNative native module is not registered.",
      });
    });
  });
});
