import { getSdkVersion, _echoJsonValue, Tealium, ErrorCode } from "../index";
import { Trace } from "../modules/Trace";

// Builds a Tealium mock without running the (native-touching) constructor, then
// wires a real Trace exactly as the constructor would. This keeps trace.* driven
// by the same withNative/_isShutdown guard as track(), so the guard-contract
// table below exercises the genuine shutdown-aware path, not a test-local fake.
function makeMockTealium(isShutdown: boolean): Tealium {
  const mock = Object.create(Tealium.prototype);
  mock.instanceId = "test-instance";
  mock._isShutdown = isShutdown; // Set before creating the proxy.
  mock.trace = new Trace(mock.createModuleProxy());
  return mock as Tealium;
}

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

  it("rejects shutdown with NATIVE_MODULE_NOT_REGISTERED code when native binding is missing", async () => {
    const mockInstance = Object.create(Tealium.prototype);
    mockInstance.instanceId = "test-instance";
    mockInstance._isShutdown = false;

    await expect(mockInstance.shutdown()).rejects.toMatchObject({
      code: ErrorCode.NATIVE_MODULE_NOT_REGISTERED,
      message: "TealiumPrismReactNative native module is not registered.",
    });
  });

  // track and the trace API (trace.join / trace.leave / trace.forceEndOfVisit)
  // share the same guard contract: reject with INSTANCE_SHUT_DOWN when shut down
  // and NATIVE_MODULE_NOT_REGISTERED when the native binding is missing.
  // End-to-end behavior is verified in native tests and the example app.
  const tealiumMethods: Array<[string, (i: Tealium) => Promise<unknown>]> = [
    ["track", (i) => i.track("event_name")],
    ["trace.join", (i) => i.trace.join("trace-123")],
    ["trace.leave", (i) => i.trace.leave()],
    ["trace.forceEndOfVisit", (i) => i.trace.forceEndOfVisit()],
  ];

  describe.each(tealiumMethods)("%s", (_name, call) => {
    it("rejects with INSTANCE_SHUT_DOWN code when instance has been shut down", async () => {
      await expect(call(makeMockTealium(true))).rejects.toMatchObject({
        code: ErrorCode.INSTANCE_SHUT_DOWN,
        message: 'Tealium instance "test-instance" has been shut down.',
      });
    });

    it("rejects with NATIVE_MODULE_NOT_REGISTERED code when native binding is missing", async () => {
      await expect(call(makeMockTealium(false))).rejects.toMatchObject({
        code: ErrorCode.NATIVE_MODULE_NOT_REGISTERED,
        message: "TealiumPrismReactNative native module is not registered.",
      });
    });
  });
});
