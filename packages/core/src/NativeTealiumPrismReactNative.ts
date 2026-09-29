import { TurboModuleRegistry, type TurboModule } from "react-native";

export interface Spec extends TurboModule {
  getSdkVersion(): Promise<string>;
  echoJsonValue(input: string): Promise<string>;
  /**
   * Creates (or reuses) the native Tealium instance and returns its id. The id
   * is the SDK's `TealiumConfig.key` on both platforms — the string
   * `"{account}-{profile}"` (e.g. account `"tealium"` + profile `"main"` →
   * `"tealium-main"`) — so it is stable for a given account/profile pair rather
   * than an opaque per-call token. It is the handle every other method passes
   * back to native to address one instance. The SDK reuses (and logs a warning
   * for) an existing instance when a duplicate key is created.
   */
  create(
    account: string,
    profile: string,
    environment: string,
    settingsFile: string | null,
    settingsUrl: string | null,
    logLevel: string | null
  ): string;
  track(
    instanceId: string,
    name: string,
    type: string,
    dataJson: string | null
  ): Promise<string>;
  /**
   * Shuts the instance down. This and every other payload-less method below
   * resolve with no value: `nil` on iOS surfaces as JS `undefined`, `null` on
   * Android surfaces as JS `null` (per this repo's native bridge), and the JS
   * wrapper normalizes both to `undefined`.
   */
  shutdown(instanceId: string): Promise<void>;
  /** Joins a trace for `id`. Payload-less; see {@link shutdown}. */
  joinTrace(instanceId: string, id: string): Promise<void>;
  /** Leaves the current trace, if any. Payload-less; see {@link shutdown}. */
  leaveTrace(instanceId: string): Promise<void>;
  forceEndOfVisit(instanceId: string): Promise<string>;
  /**
   * Stores a JSON object in the data layer. `expiryEncoded` is the encoded
   * expiry policy: `-1` forever, `-2` session, `-3` untilRestart, `>= 0` a
   * duration in seconds; `null` omits the policy, which the native SDK
   * defaults to forever. Payload-less; see {@link shutdown}.
   */
  dataLayerPutData(
    instanceId: string,
    dataJson: string,
    expiryEncoded: number | null
  ): Promise<void>;
  /**
   * Stores a single key/value pair in the data layer. `expiryEncoded` uses the
   * same sentinel encoding as `dataLayerPutData`. Payload-less; see
   * {@link shutdown}.
   */
  dataLayerPutValue(
    instanceId: string,
    key: string,
    valueJson: string,
    expiryEncoded: number | null
  ): Promise<void>;
  /**
   * Resolves the JSON-encoded value stored under `key`, or `null` if the key
   * is absent (a stored JSON `null` resolves the string `"null"`, not the
   * native `null`).
   */
  dataLayerGet(instanceId: string, key: string): Promise<string | null>;
  /** Resolves every stored key/value pair as a single JSON object string. */
  dataLayerGetAll(instanceId: string): Promise<string>;
  /** Removes every key in `keys`. Payload-less; see {@link shutdown}. */
  dataLayerRemove(
    instanceId: string,
    keys: ReadonlyArray<string>
  ): Promise<void>;
  /** Removes every key from the data layer. Payload-less; see {@link shutdown}. */
  dataLayerClear(instanceId: string): Promise<void>;
}

// Use the non-throwing getter so JS-only environments (web fallback, Jest)
// can import this module without a registered native binding.
export default TurboModuleRegistry.get<Spec>("TealiumPrismReactNative");
