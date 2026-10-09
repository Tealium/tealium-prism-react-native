// Verifies that Tealium.track reports unserializable data as a rejected Promise
// rather than a synchronous throw, so callers can rely on `.catch`.
jest.mock("../NativeTealiumPrismReactNative", () => ({
  __esModule: true,
  default: {
    create: () => "mock-instance-id",
    track: jest.fn(() => Promise.resolve("{}")),
    shutdown: () => Promise.resolve(),
    getSdkVersion: () => Promise.resolve("1.0.0"),
  },
}));

import NativeTealiumPrismReactNative from "../NativeTealiumPrismReactNative";
import { Tealium } from "../index";
import type { JsonValueObject } from "../index";

const nativeTrack = NativeTealiumPrismReactNative!.track as jest.Mock;

describe("Tealium.track with unserializable data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects instead of throwing for circular data", async () => {
    const instance = Tealium.create("account", "circular", "dev");
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    let promise: Promise<unknown> | undefined;
    expect(() => {
      promise = instance.track(
        "event_name",
        "event",
        circular as unknown as JsonValueObject
      );
    }).not.toThrow();

    await expect(promise).rejects.toBeInstanceOf(Error);
    expect(nativeTrack).not.toHaveBeenCalled();
  });

  it("rejects instead of throwing for BigInt values", async () => {
    const instance = Tealium.create("account", "bigint", "dev");
    const data = { big: BigInt(1) } as unknown as JsonValueObject;

    let promise: Promise<unknown> | undefined;
    expect(() => {
      promise = instance.track("event_name", "event", data);
    }).not.toThrow();

    await expect(promise).rejects.toBeInstanceOf(Error);
    expect(nativeTrack).not.toHaveBeenCalled();
  });
});
