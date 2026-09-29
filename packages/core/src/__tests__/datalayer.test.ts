// Verifies DataLayer.putAll/put/get/getAll/remove/clear marshal to the six native
// dataLayer* bridge methods: expiry encoding, JSON serialization, the
// null (absent key) vs "null" (stored null) distinction on get(), and that
// the void-returning methods normalize their no-payload native result (nil on
// iOS, null on Android) to undefined.
jest.mock("../NativeTealiumPrismReactNative", () => ({
  __esModule: true,
  default: {
    create: () => "mock-instance-id",
    track: () => Promise.resolve("{}"),
    echoJsonValue: () => Promise.resolve("{}"),
    shutdown: () => Promise.resolve(),
    getSdkVersion: () => Promise.resolve("1.0.0"),
    dataLayerPutAll: jest.fn(() => Promise.resolve()),
    dataLayerPutValue: jest.fn(() => Promise.resolve()),
    dataLayerGet: jest.fn(() => Promise.resolve(null)),
    dataLayerGetAll: jest.fn(() => Promise.resolve("{}")),
    dataLayerRemove: jest.fn(() => Promise.resolve()),
    dataLayerClear: jest.fn(() => Promise.resolve()),
  },
}));

import NativeTealiumPrismReactNative from "../NativeTealiumPrismReactNative";
import { Tealium } from "../index";
import type { Expiry } from "../types";

const native = NativeTealiumPrismReactNative!;

describe("DataLayer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const expiryCases: Array<[Expiry, number]> = [
    ["forever", -1],
    ["session", -2],
    ["untilRestart", -3],
    [new Date(1_700_000_000_123), 1_700_000_000_123],
  ];

  describe("putAll (bulk)", () => {
    it("serializes the data object and passes null expiry when omitted", async () => {
      const instance = Tealium.create("account", "putall-bulk-omitted", "dev");

      await instance.dataLayer.putAll({ a: 1, b: "two" });

      expect(native.dataLayerPutAll).toHaveBeenCalledWith(
        instance.instanceId,
        '{"a":1,"b":"two"}',
        null
      );
    });

    it("resolves undefined when native resolves null (Android payload-less result)", async () => {
      const instance = Tealium.create("account", "putall-bulk-void", "dev");
      (native.dataLayerPutAll as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        instance.dataLayer.putAll({ a: 1 })
      ).resolves.toBeUndefined();
    });

    it("resolves undefined when native resolves undefined (iOS payload-less result)", async () => {
      const instance = Tealium.create("account", "putall-bulk-void-ios", "dev");
      (native.dataLayerPutAll as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(
        instance.dataLayer.putAll({ a: 1 })
      ).resolves.toBeUndefined();
    });

    it.each(expiryCases)("encodes expiry %s to %s", async (expiry, encoded) => {
      const instance = Tealium.create(
        "account",
        `putall-bulk-${expiry}`,
        "dev"
      );

      await instance.dataLayer.putAll({ a: 1 }, expiry);

      expect(native.dataLayerPutAll).toHaveBeenCalledWith(
        instance.instanceId,
        '{"a":1}',
        encoded
      );
    });

    it("rejects an invalid date expiry without calling native", async () => {
      const instance = Tealium.create(
        "account",
        "putall-bulk-invalid-date",
        "dev"
      );

      await expect(
        instance.dataLayer.putAll({ a: 1 }, new Date(Number.NaN))
      ).rejects.toThrow("encodeExpiry: invalid Date (NaN time)");
      expect(native.dataLayerPutAll).not.toHaveBeenCalled();
    });
  });

  describe("put (single)", () => {
    it("serializes the value and passes null expiry when omitted", async () => {
      const instance = Tealium.create("account", "put-single-omitted", "dev");

      await instance.dataLayer.put("key", "value");

      expect(native.dataLayerPutValue).toHaveBeenCalledWith(
        instance.instanceId,
        "key",
        '"value"',
        null
      );
    });

    it("resolves undefined when native resolves null (Android payload-less result)", async () => {
      const instance = Tealium.create("account", "put-single-void", "dev");
      (native.dataLayerPutValue as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        instance.dataLayer.put("key", "value")
      ).resolves.toBeUndefined();
    });

    it("resolves undefined when native resolves undefined (iOS payload-less result)", async () => {
      const instance = Tealium.create("account", "put-single-void-ios", "dev");
      (native.dataLayerPutValue as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(
        instance.dataLayer.put("key", "value")
      ).resolves.toBeUndefined();
    });

    it.each(expiryCases)("encodes expiry %s to %s", async (expiry, encoded) => {
      const instance = Tealium.create("account", `put-single-${expiry}`, "dev");

      await instance.dataLayer.put("key", 42, expiry);

      expect(native.dataLayerPutValue).toHaveBeenCalledWith(
        instance.instanceId,
        "key",
        "42",
        encoded
      );
    });

    it("rejects an invalid date expiry without calling native", async () => {
      const instance = Tealium.create(
        "account",
        "put-single-invalid-date",
        "dev"
      );

      await expect(
        instance.dataLayer.put("key", 42, new Date(Number.NaN))
      ).rejects.toThrow("encodeExpiry: invalid Date (NaN time)");
      expect(native.dataLayerPutValue).not.toHaveBeenCalled();
    });
  });

  describe("get", () => {
    it("resolves undefined when native resolves null (absent key)", async () => {
      const instance = Tealium.create("account", "get-absent", "dev");
      (native.dataLayerGet as jest.Mock).mockResolvedValueOnce(null);

      await expect(instance.dataLayer.get("missing")).resolves.toBeUndefined();
    });

    it("resolves undefined when native resolves undefined (iOS nil for an absent key)", async () => {
      const instance = Tealium.create("account", "get-absent-ios", "dev");
      (native.dataLayerGet as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(instance.dataLayer.get("missing")).resolves.toBeUndefined();
    });

    it('resolves null when native resolves the string "null" (stored null)', async () => {
      const instance = Tealium.create("account", "get-stored-null", "dev");
      (native.dataLayerGet as jest.Mock).mockResolvedValueOnce("null");

      await expect(instance.dataLayer.get("key")).resolves.toBeNull();
    });

    it("resolves the parsed JSON value for a stored object", async () => {
      const instance = Tealium.create("account", "get-object", "dev");
      (native.dataLayerGet as jest.Mock).mockResolvedValueOnce('{"a":1}');

      await expect(instance.dataLayer.get("key")).resolves.toEqual({ a: 1 });
    });
  });

  describe("getAll", () => {
    it("parses the native JSON object string", async () => {
      const instance = Tealium.create("account", "getall", "dev");
      (native.dataLayerGetAll as jest.Mock).mockResolvedValueOnce(
        '{"a":1,"b":2}'
      );

      await expect(instance.dataLayer.getAll()).resolves.toEqual({
        a: 1,
        b: 2,
      });
    });
  });

  describe("remove", () => {
    it("encodes a single key as a one-element JSON array", async () => {
      const instance = Tealium.create("account", "remove-key", "dev");

      await instance.dataLayer.remove("k");

      expect(native.dataLayerRemove).toHaveBeenCalledWith(instance.instanceId, [
        "k",
      ]);
    });

    it("resolves undefined for a single key when native resolves null (Android payload-less result)", async () => {
      const instance = Tealium.create("account", "remove-key-void", "dev");
      (native.dataLayerRemove as jest.Mock).mockResolvedValueOnce(null);

      await expect(instance.dataLayer.remove("k")).resolves.toBeUndefined();
    });

    it("resolves undefined for a single key when native resolves undefined (iOS payload-less result)", async () => {
      const instance = Tealium.create("account", "remove-key-void-ios", "dev");
      (native.dataLayerRemove as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(instance.dataLayer.remove("k")).resolves.toBeUndefined();
    });

    it("encodes an array of keys as a JSON array", async () => {
      const instance = Tealium.create("account", "remove-keys", "dev");

      await instance.dataLayer.remove(["a", "b"]);

      expect(native.dataLayerRemove).toHaveBeenCalledWith(instance.instanceId, [
        "a",
        "b",
      ]);
    });

    it("resolves undefined for an array of keys when native resolves null (Android payload-less result)", async () => {
      const instance = Tealium.create("account", "remove-keys-void", "dev");
      (native.dataLayerRemove as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        instance.dataLayer.remove(["a", "b"])
      ).resolves.toBeUndefined();
    });

    it("resolves undefined for an array of keys when native resolves undefined (iOS payload-less result)", async () => {
      const instance = Tealium.create("account", "remove-keys-void-ios", "dev");
      (native.dataLayerRemove as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(
        instance.dataLayer.remove(["a", "b"])
      ).resolves.toBeUndefined();
    });
  });

  describe("clear", () => {
    it("calls native dataLayerClear with the instance id", async () => {
      const instance = Tealium.create("account", "clear", "dev");

      await instance.dataLayer.clear();

      expect(native.dataLayerClear).toHaveBeenCalledWith(instance.instanceId);
    });

    it("resolves undefined when native resolves null (Android payload-less result)", async () => {
      const instance = Tealium.create("account", "clear-void", "dev");
      (native.dataLayerClear as jest.Mock).mockResolvedValueOnce(null);

      await expect(instance.dataLayer.clear()).resolves.toBeUndefined();
    });

    it("resolves undefined when native resolves undefined (iOS payload-less result)", async () => {
      const instance = Tealium.create("account", "clear-void-ios", "dev");
      (native.dataLayerClear as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(instance.dataLayer.clear()).resolves.toBeUndefined();
    });
  });
});
