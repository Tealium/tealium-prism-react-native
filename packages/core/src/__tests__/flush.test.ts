// Verifies flushEventQueue() passes the instance id, resolves undefined, and surfaces native rejections.
jest.mock("../NativeTealiumPrismReactNative", () => ({
  __esModule: true,
  default: {
    create: jest.fn(
      (account: string, profile: string) => `${account}-${profile}`
    ),
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

    expect(native.flushEventQueue).toHaveBeenCalledWith("account-flush-args");
  });

  it.each([null, undefined])(
    "resolves undefined when native resolves %s",
    async (nativeResult) => {
      const instance = Tealium.create(
        "account",
        `flush-void-${nativeResult}`,
        "dev"
      );
      (native.flushEventQueue as jest.Mock).mockResolvedValueOnce(nativeResult);

      await expect(instance.flushEventQueue()).resolves.toBeUndefined();
    }
  );

  it("rejects with the native error when native rejects", async () => {
    const instance = Tealium.create("account", "flush-reject", "dev");
    const nativeError = new Error("native flush failed");
    (native.flushEventQueue as jest.Mock).mockRejectedValueOnce(nativeError);

    await expect(instance.flushEventQueue()).rejects.toBe(nativeError);
  });
});
