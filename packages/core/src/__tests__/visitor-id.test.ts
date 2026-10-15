// Verifies VisitorIdManager.current/regenerate/eraseLocalHistory each forward the
// instance id to the matching native bridge method exactly once, resolve with
// the parsed visitor id, and propagate native rejections unchanged.
jest.mock("../NativeTealiumPrismReactNative", () => ({
  __esModule: true,
  default: {
    create: jest.fn(
      (account: string, profile: string) => `${account}-${profile}`
    ),
    getVisitorId: jest.fn(() =>
      Promise.resolve(JSON.stringify("visitor-current"))
    ),
    regenerateVisitorId: jest.fn(() =>
      Promise.resolve(JSON.stringify("visitor-regenerated"))
    ),
    eraseVisitorIdLocalHistory: jest.fn(() =>
      Promise.resolve(JSON.stringify("visitor-erased"))
    ),
  },
}));

import NativeTealiumPrismReactNative from "../NativeTealiumPrismReactNative";
import { Tealium, ErrorCode } from "../index";

const native = NativeTealiumPrismReactNative!;

describe("Tealium.visitorId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("current", () => {
    it("calls native getVisitorId with the instance id exactly once", async () => {
      const instance = Tealium.create("account", "visitor-current", "dev");

      await instance.visitorId.current();

      expect(native.getVisitorId).toHaveBeenCalledTimes(1);
      expect(native.getVisitorId).toHaveBeenCalledWith(instance.instanceId);
    });

    it("resolves with the parsed visitor id", async () => {
      const instance = Tealium.create(
        "account",
        "visitor-current-value",
        "dev"
      );

      await expect(instance.visitorId.current()).resolves.toBe(
        "visitor-current"
      );
    });

    it("rejects with the native error when native rejects", async () => {
      const instance = Tealium.create(
        "account",
        "visitor-current-reject",
        "dev"
      );
      const nativeError = new Error("native getVisitorId failed");
      (native.getVisitorId as jest.Mock).mockRejectedValueOnce(nativeError);

      await expect(instance.visitorId.current()).rejects.toBe(nativeError);
    });

    it("rejects with DATA_PARSE_ERROR when native returns non-JSON", async () => {
      const instance = Tealium.create(
        "account",
        "visitor-current-malformed",
        "dev"
      );
      const malformedJson = "not valid json {{{";
      (native.getVisitorId as jest.Mock).mockResolvedValueOnce(malformedJson);

      await expect(instance.visitorId.current()).rejects.toMatchObject({
        code: ErrorCode.DATA_PARSE_ERROR,
        message: `Tealium.visitorId.current: native returned non-JSON string: ${malformedJson}`,
      });
    });
  });

  describe("regenerate", () => {
    it("calls native regenerateVisitorId with the instance id exactly once", async () => {
      const instance = Tealium.create("account", "visitor-regen", "dev");

      await instance.visitorId.regenerate();

      expect(native.regenerateVisitorId).toHaveBeenCalledTimes(1);
      expect(native.regenerateVisitorId).toHaveBeenCalledWith(
        instance.instanceId
      );
    });

    it("resolves with the parsed visitor id", async () => {
      const instance = Tealium.create("account", "visitor-regen-value", "dev");

      await expect(instance.visitorId.regenerate()).resolves.toBe(
        "visitor-regenerated"
      );
    });

    it("rejects with the native error when native rejects", async () => {
      const instance = Tealium.create("account", "visitor-regen-reject", "dev");
      const nativeError = new Error("native regenerateVisitorId failed");
      (native.regenerateVisitorId as jest.Mock).mockRejectedValueOnce(
        nativeError
      );

      await expect(instance.visitorId.regenerate()).rejects.toBe(nativeError);
    });
  });

  describe("eraseLocalHistory", () => {
    it("calls native eraseVisitorIdLocalHistory with the instance id exactly once", async () => {
      const instance = Tealium.create("account", "visitor-erase", "dev");

      await instance.visitorId.eraseLocalHistory();

      expect(native.eraseVisitorIdLocalHistory).toHaveBeenCalledTimes(1);
      expect(native.eraseVisitorIdLocalHistory).toHaveBeenCalledWith(
        instance.instanceId
      );
    });

    it("resolves with the parsed visitor id", async () => {
      const instance = Tealium.create("account", "visitor-erase-value", "dev");

      await expect(instance.visitorId.eraseLocalHistory()).resolves.toBe(
        "visitor-erased"
      );
    });

    it("rejects with the native error when native rejects", async () => {
      const instance = Tealium.create("account", "visitor-erase-reject", "dev");
      const nativeError = new Error("native eraseVisitorIdLocalHistory failed");
      (native.eraseVisitorIdLocalHistory as jest.Mock).mockRejectedValueOnce(
        nativeError
      );

      await expect(instance.visitorId.eraseLocalHistory()).rejects.toBe(
        nativeError
      );
    });
  });
});
