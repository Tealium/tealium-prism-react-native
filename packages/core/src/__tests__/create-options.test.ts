// Verifies that Tealium.create maps its optional config options onto the
// native create() call. The bridge spec takes flat, nullable primitives, so
// each option is coalesced to its value or null at the boundary (mirroring the
// existing logLevel handling). Native SDK behavior for those settings sources
// is covered by the underlying Prism SDKs, not here.
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

describe("Tealium.create options", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes null for every settings source when options is omitted", () => {
    Tealium.create("acct", "no-options", "dev");

    expect(nativeCreate).toHaveBeenCalledWith(
      "acct",
      "no-options",
      "dev",
      null,
      null,
      null
    );
  });

  it("forwards logLevel, settingsFile, and settingsUrl when provided", () => {
    Tealium.create("acct", "all-options", "dev", {
      logLevel: "debug",
      settingsFile: "tealium-settings.json",
      settingsUrl: "https://cdn.example.com/mobile.settings.json",
    });

    expect(nativeCreate).toHaveBeenCalledWith(
      "acct",
      "all-options",
      "dev",
      "debug",
      "tealium-settings.json",
      "https://cdn.example.com/mobile.settings.json"
    );
  });

  it("coalesces only the omitted options to null", () => {
    Tealium.create("acct", "partial-options", "dev", {
      settingsUrl: "https://cdn.example.com/mobile.settings.json",
    });

    expect(nativeCreate).toHaveBeenCalledWith(
      "acct",
      "partial-options",
      "dev",
      null,
      null,
      "https://cdn.example.com/mobile.settings.json"
    );
  });
});
