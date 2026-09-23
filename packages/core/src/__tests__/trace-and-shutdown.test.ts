// Verifies the void-returning Trace methods and shutdown() normalize the
// native result to undefined: joinTrace/leaveTrace resolve the JSON string
// "null" (the SDK emits Void, which the native bridge's promise adapters encode
// as a null DataItem); shutdown bypasses those adapters and resolves with no
// payload (nil on iOS, null on Android).
jest.mock("../NativeTealiumPrismReactNative", () => ({
  __esModule: true,
  default: {
    create: () => "mock-instance-id",
    track: () => Promise.resolve("{}"),
    echoJsonValue: () => Promise.resolve("{}"),
    shutdown: jest.fn(() => Promise.resolve(null)),
    getSdkVersion: () => Promise.resolve("1.0.0"),
    joinTrace: jest.fn(() => Promise.resolve("null")),
    leaveTrace: jest.fn(() => Promise.resolve("null")),
    forceEndOfVisit: jest.fn(() => Promise.resolve("{}")),
  },
}));

import NativeTealiumPrismReactNative from "../NativeTealiumPrismReactNative";
import { Tealium } from "../index";

const native = NativeTealiumPrismReactNative!;

describe("Trace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("join", () => {
    it("calls joinTrace with the instance id and trace id", async () => {
      const instance = Tealium.create("account", "trace-join-args", "dev");

      await instance.trace.join("trace-123");

      expect(native.joinTrace).toHaveBeenCalledWith(
        instance.instanceId,
        "trace-123"
      );
    });

    it('resolves undefined when native resolves the "null" JSON string', async () => {
      const instance = Tealium.create("account", "trace-join-void", "dev");
      (native.joinTrace as jest.Mock).mockResolvedValueOnce("null");

      await expect(instance.trace.join("trace-123")).resolves.toBeUndefined();
    });
  });

  describe("leave", () => {
    it("calls leaveTrace with the instance id", async () => {
      const instance = Tealium.create("account", "trace-leave-args", "dev");

      await instance.trace.leave();

      expect(native.leaveTrace).toHaveBeenCalledWith(instance.instanceId);
    });

    it('resolves undefined when native resolves the "null" JSON string', async () => {
      const instance = Tealium.create("account", "trace-leave-void", "dev");
      (native.leaveTrace as jest.Mock).mockResolvedValueOnce("null");

      await expect(instance.trace.leave()).resolves.toBeUndefined();
    });
  });
});

describe("Tealium.shutdown", () => {
  it("resolves undefined when native resolves null (Android payload-less result)", async () => {
    const instance = Tealium.create("account", "shutdown-void", "dev");
    (native.shutdown as jest.Mock).mockResolvedValueOnce(null);

    await expect(instance.shutdown()).resolves.toBeUndefined();
  });
});
