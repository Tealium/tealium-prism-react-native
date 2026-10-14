// Verifies flushEventQueue() calls native with the instance id and normalizes
// the native result to undefined: it resolves with no payload (nil on iOS,
// surfacing as JS undefined; null on Android, surfacing as JS null).
jest.mock("../NativeTealiumPrismReactNative", () => ({
  __esModule: true,
  default: {
    create: () => "mock-instance-id",
    flushEventQueue: jest.fn(() => Promise.resolve(null)),
  },
}));

import NativeTealiumPrismReactNative from "../NativeTealiumPrismReactNative";
import { Tealium } from "../index";

const native = NativeTealiumPrismReactNative!;

describe("Tealium.flushEventQueue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls flushEventQueue with the instance id", async () => {
    const instance = Tealium.create("account", "flush-args", "dev");

    await instance.flushEventQueue();

    expect(native.flushEventQueue).toHaveBeenCalledWith(instance.instanceId);
  });

  it("resolves undefined when native resolves null (Android payload-less result)", async () => {
    const instance = Tealium.create("account", "flush-void", "dev");
    (native.flushEventQueue as jest.Mock).mockResolvedValueOnce(null);

    await expect(instance.flushEventQueue()).resolves.toBeUndefined();
  });

  it("resolves undefined when native resolves undefined (iOS payload-less result)", async () => {
    const instance = Tealium.create("account", "flush-void-ios", "dev");
    (native.flushEventQueue as jest.Mock).mockResolvedValueOnce(undefined);

    await expect(instance.flushEventQueue()).resolves.toBeUndefined();
  });
});
