const INVALID_JSON = "not valid json {{{";

jest.mock("../NativeTealiumPrismReactNative", () => ({
  __esModule: true,
  default: {
    create: () => "mock-instance-id",
    track: () => Promise.resolve(INVALID_JSON),
    forceEndOfVisit: () => Promise.resolve(INVALID_JSON),
    echoJsonValue: () => Promise.resolve(INVALID_JSON),
    shutdown: () => Promise.resolve(),
    getSdkVersion: () => Promise.resolve("1.0.0"),
  },
}));

import { Tealium, _echoJsonValue, ErrorCode } from "../index";

describe("DATA_PARSE_ERROR", () => {
  it("Tealium.track rejects with DATA_PARSE_ERROR when native returns non-JSON", async () => {
    const instance = Tealium.create("account", "profile", "dev");

    await expect(instance.track("event_name")).rejects.toMatchObject({
      code: ErrorCode.DATA_PARSE_ERROR,
      message: `Tealium.track: native returned non-JSON string: ${INVALID_JSON}`,
    });
  });

  it("Tealium.trace.forceEndOfVisit rejects with DATA_PARSE_ERROR when native returns non-JSON", async () => {
    const instance = Tealium.create("account", "profile", "dev");

    await expect(instance.trace.forceEndOfVisit()).rejects.toMatchObject({
      code: ErrorCode.DATA_PARSE_ERROR,
      message: `Tealium.trace.forceEndOfVisit: native returned non-JSON string: ${INVALID_JSON}`,
    });
  });

  it("_echoJsonValue rejects with DATA_PARSE_ERROR when native returns non-JSON", async () => {
    await expect(_echoJsonValue(42)).rejects.toMatchObject({
      code: ErrorCode.DATA_PARSE_ERROR,
      message: `_echoJsonValue: native returned non-JSON string: ${INVALID_JSON}`,
    });
  });
});
