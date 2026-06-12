import { isWrapperLoaded } from "../index";

// In the Jest (JS-only) environment no native TurboModule is registered, so the
// wrapper reports as not loaded. This guards the contract that the probe is a
// boolean and degrades gracefully off-device. End-to-end "loaded" verification
// happens in the example app on a real iOS/Android build.
describe("isWrapperLoaded", () => {
  it("returns a boolean", () => {
    expect(typeof isWrapperLoaded()).toBe("boolean");
  });

  it("reports not loaded without a native binding", () => {
    expect(isWrapperLoaded()).toBe(false);
  });
});
