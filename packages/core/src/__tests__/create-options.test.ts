// Verifies that Tealium.create maps its optional settings arguments onto the
// native create() call. The JS API and the native spec share the same argument
// order (settingsFile, settingsUrl, logLevel); the bridge spec takes flat,
// nullable primitives, so each argument is coalesced to its value or null at
// the boundary. Native SDK behavior for those settings sources is covered by
// the underlying Prism SDKs, not here.
jest.mock("../NativeTealiumPrismReactNative", () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => "mock-instance-id"),
    track: () => Promise.resolve("{}"),
    echoJsonValue: () => Promise.resolve("{}"),
    shutdown: () => Promise.resolve(),
    getSdkVersion: () => Promise.resolve("1.0.0"),
  },
}));

import NativeTealiumPrismReactNative from "../NativeTealiumPrismReactNative";
import { Tealium } from "../index";

const nativeCreate = NativeTealiumPrismReactNative!.create;

describe("Tealium.create settings arguments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes null for every settings source when no arguments are provided", () => {
    Tealium.create("acct", "no-args", "dev");

    expect(nativeCreate).toHaveBeenCalledWith(
      "acct",
      "no-args",
      "dev",
      null,
      null,
      null
    );
  });

  it("forwards settingsFile, settingsUrl, and logLevel when provided", () => {
    Tealium.create(
      "acct",
      "all-args",
      "dev",
      "tealium-settings.json",
      "https://cdn.example.com/mobile.settings.json",
      "debug"
    );

    expect(nativeCreate).toHaveBeenCalledWith(
      "acct",
      "all-args",
      "dev",
      "tealium-settings.json",
      "https://cdn.example.com/mobile.settings.json",
      "debug"
    );
  });

  it("coalesces only the omitted arguments to null", () => {
    Tealium.create(
      "acct",
      "partial-args",
      "dev",
      undefined,
      "https://cdn.example.com/mobile.settings.json"
    );

    expect(nativeCreate).toHaveBeenCalledWith(
      "acct",
      "partial-args",
      "dev",
      null,
      "https://cdn.example.com/mobile.settings.json",
      null
    );
  });
});
