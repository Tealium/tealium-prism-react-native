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
   * Shuts the instance down. Unlike the other payload-less methods this is
   * `Promise<void>`, not `Promise<string>`: both SDKs expose shutdown as a
   * synchronous call with no `Single`, so it never passes through the native
   * bridge's promise adapters and their `"null"` encoding. The bridge resolves
   * `nil` on iOS (JS `undefined`) and `null` on Android (JS `null`);
   * `Tealium.shutdown` normalizes both to `undefined`.
   */
  shutdown(instanceId: string): Promise<void>;
  /**
   * Joins a trace for `id`. Resolves the JSON string `"null"`: the SDK emits
   * `Void`, which the native bridge (this repo's promise adapters) encodes as a
   * null `DataItem`; the JS wrapper normalizes that to `undefined`.
   */
  joinTrace(instanceId: string, id: string): Promise<string>;
  /**
   * Leaves the current trace, if any. Resolves the JSON string `"null"`: the
   * SDK emits `Void`, which the native bridge (this repo's promise adapters)
   * encodes as a null `DataItem`; the JS wrapper normalizes that to
   * `undefined`.
   */
  leaveTrace(instanceId: string): Promise<string>;
  forceEndOfVisit(instanceId: string): Promise<string>;
  /**
   * Stores a JSON object in the data layer. `expiryEncoded` is the encoded
   * expiry policy: `-1` forever, `-2` session, `-3` untilRestart, `>= 0` a
   * duration in seconds; `null` omits the policy, which the native SDK
   * defaults to forever. Resolves the JSON string `"null"`: the SDK emits
   * `Void`, which the native bridge (this repo's promise adapters) encodes as a
   * null `DataItem`; the JS wrapper normalizes that to `undefined`.
   */
  dataLayerPutData(
    instanceId: string,
    dataJson: string,
    expiryEncoded: number | null
  ): Promise<string>;
  /**
   * Stores a single key/value pair in the data layer. `expiryEncoded` uses the
   * same sentinel encoding as `dataLayerPutData`. Resolves the JSON string
   * `"null"`: the SDK emits `Void`, which the native bridge (this repo's
   * promise adapters) encodes as a null `DataItem`; the JS wrapper normalizes
   * that to `undefined`.
   */
  dataLayerPutValue(
    instanceId: string,
    key: string,
    valueJson: string,
    expiryEncoded: number | null
  ): Promise<string>;
  /**
   * Resolves the JSON-encoded value stored under `key`, or `null` if the key
   * is absent (a stored JSON `null` resolves the string `"null"`, not the
   * native `null`).
   */
  dataLayerGet(instanceId: string, key: string): Promise<string | null>;
  /** Resolves every stored key/value pair as a single JSON object string. */
  dataLayerGetAll(instanceId: string): Promise<string>;
  /**
   * Removes the keys in `keysJson`, always a JSON array of strings. Resolves
   * the JSON string `"null"`: the SDK emits `Void`, which the native bridge
   * (this repo's promise adapters) encodes as a null `DataItem`; the JS
   * wrapper normalizes that to `undefined`.
   */
  dataLayerRemove(instanceId: string, keysJson: string): Promise<string>;
  /**
   * Removes every key from the data layer. Resolves the JSON string `"null"`:
   * the SDK emits `Void`, which the native bridge (this repo's promise
   * adapters) encodes as a null `DataItem`; the JS wrapper normalizes that to
   * `undefined`.
   */
  dataLayerClear(instanceId: string): Promise<string>;
}

// Use the non-throwing getter so JS-only environments (web fallback, Jest)
// can import this module without a registered native binding.
export default TurboModuleRegistry.get<Spec>("TealiumPrismReactNative");
