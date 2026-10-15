// Verifies VisitorIdManager.current/regenerate/eraseLocalHistory each forward the
// instance id to the matching native bridge method exactly once, resolve with
// the parsed visitor ID, and propagate native rejections unchanged.
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
      Promise.resolve(JSON.stringify("visitor-regenerate"))
    ),
    eraseVisitorIdLocalHistory: jest.fn(() =>
      Promise.resolve(JSON.stringify("visitor-eraseLocalHistory"))
    ),
  },
}));

import NativeTealiumPrismReactNative from "../NativeTealiumPrismReactNative";
import { Tealium, ErrorCode } from "../index";

const native = NativeTealiumPrismReactNative!;

type VisitorIdNativeMethod =
  | "getVisitorId"
  | "regenerateVisitorId"
  | "eraseVisitorIdLocalHistory";

// [wrapper method, native bridge method, call]. Each native mock resolves with
// the JSON of `visitor-<wrapper method>`.
const visitorIdMethods: Array<
  [string, VisitorIdNativeMethod, (i: Tealium) => Promise<string>]
> = [
  ["current", "getVisitorId", (i) => i.visitorId.current()],
  ["regenerate", "regenerateVisitorId", (i) => i.visitorId.regenerate()],
  [
    "eraseLocalHistory",
    "eraseVisitorIdLocalHistory",
    (i) => i.visitorId.eraseLocalHistory(),
  ],
];

describe.each(visitorIdMethods)(
  "Tealium.visitorId.%s",
  (name, nativeMethod, call) => {
    // Tealium.create caches by account/profile, so each test uses its own profile.
    const create = (test: string) =>
      Tealium.create("account", `visitor-${name}-${test}`, "dev");

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it(`calls native ${nativeMethod} with the instance id exactly once`, async () => {
      const instance = create("forward");

      await call(instance);

      expect(native[nativeMethod]).toHaveBeenCalledTimes(1);
      expect(native[nativeMethod]).toHaveBeenCalledWith(instance.instanceId);
    });

    it("resolves with the parsed visitor ID", async () => {
      await expect(call(create("value"))).resolves.toBe(`visitor-${name}`);
    });

    it("rejects with the native error when native rejects", async () => {
      const instance = create("reject");
      const nativeError = new Error(`native ${nativeMethod} failed`);
      (native[nativeMethod] as jest.Mock).mockRejectedValueOnce(nativeError);

      await expect(call(instance)).rejects.toBe(nativeError);
    });

    it("rejects with DATA_PARSE_ERROR when native returns non-JSON", async () => {
      const instance = create("malformed");
      const malformedJson = "not valid json {{{";
      (native[nativeMethod] as jest.Mock).mockResolvedValueOnce(malformedJson);

      await expect(call(instance)).rejects.toMatchObject({
        code: ErrorCode.DATA_PARSE_ERROR,
        message: `Tealium.visitorId.${name}: native returned non-JSON string: ${malformedJson}`,
      });
    });
  }
);
