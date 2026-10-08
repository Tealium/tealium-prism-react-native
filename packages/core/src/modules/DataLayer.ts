import type { ModuleProxy } from "./ModuleProxy";
import type { Expiry, JsonValue, JsonValueObject } from "../types";
import { encodeExpiry, parseJsonValue, serialize } from "../serialization";

/**
 * DataLayer facade bound to a Tealium instance. Mirrors the native Prism
 * `DataLayer` module (prism-swift `DataLayer` protocol, prism-kotlin
 * `DataLayer` interface). Reached via {@link Tealium.dataLayer}.
 */
export class DataLayer {
  /** @internal Constructed by {@link Tealium}; not part of the public API. */
  constructor(private readonly proxy: ModuleProxy) {}

  /**
   * Stores every key/value pair in `data`, replacing any existing value for
   * each key. An omitted `expiry` stores forever; a `Date` expires the entries
   * at that time. Rejects without calling native if `expiry` is an invalid
   * `Date`.
   */
  putAll(data: JsonValueObject, expiry?: Expiry): Promise<void> {
    return this.proxy
      .withNative((native) =>
        native.dataLayerPutAll(
          this.proxy.instanceId,
          serialize(data),
          encodeExpiry(expiry)
        )
      )
      .then(() => undefined);
  }

  /**
   * Stores a single `key`/`value` pair, replacing any existing value for that
   * key. An omitted `expiry` stores forever; a `Date` expires the entry at that
   * time. Rejects without calling native if `expiry` is an invalid `Date`.
   */
  put(key: string, value: JsonValue, expiry?: Expiry): Promise<void> {
    return this.proxy
      .withNative((native) =>
        native.dataLayerPutValue(
          this.proxy.instanceId,
          key,
          serialize(value),
          encodeExpiry(expiry)
        )
      )
      .then(() => undefined);
  }

  /**
   * Resolves the value stored under `key`, or `undefined` if the key is
   * absent. A stored JSON `null` resolves `null`, distinct from an absent key.
   */
  get(key: string): Promise<JsonValue | undefined> {
    return this.proxy.withNative((native) =>
      native.dataLayerGet(this.proxy.instanceId, key).then((json) =>
        // Absent key: the native bridge resolves null on both platforms
        // (Android `promise.resolve(null)`, iOS `NSNull`). The loose check also
        // tolerates undefined in case a bridge ever resolves nil.
        json == null ? undefined : parseJsonValue(json, "Tealium.dataLayer.get")
      )
    );
  }

  /** Resolves every stored key/value pair as a single object. */
  getAll(): Promise<JsonValueObject> {
    return this.proxy.withNative((native) =>
      native
        .dataLayerGetAll(this.proxy.instanceId)
        .then(
          (json) =>
            parseJsonValue(json, "Tealium.dataLayer.getAll") as JsonValueObject
        )
    );
  }

  /** Removes the value stored under `key`, if any. */
  remove(key: string): Promise<void>;
  /** Removes the values stored under every key in `keys`. */
  remove(keys: string[]): Promise<void>;
  remove(keyOrKeys: string | string[]): Promise<void> {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    return this.proxy
      .withNative((native) =>
        native.dataLayerRemove(this.proxy.instanceId, keys)
      )
      .then(() => undefined);
  }

  /** Removes every key from the data layer. */
  clear(): Promise<void> {
    return this.proxy
      .withNative((native) => native.dataLayerClear(this.proxy.instanceId))
      .then(() => undefined);
  }
}
