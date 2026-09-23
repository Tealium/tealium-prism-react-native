import type { ModuleProxy } from "./ModuleProxy";
import type { ExpiryPolicy, JsonValue, JsonValueObject } from "../types";
import {
  encodeExpiryPolicy,
  parseJsonValue,
  serialize,
} from "../serialization";

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
   * each key. An omitted `expiry` stores forever.
   */
  put(data: JsonValueObject, expiry?: ExpiryPolicy): Promise<void>;
  /**
   * Stores a single `key`/`value` pair, replacing any existing value for that
   * key. An omitted `expiry` stores forever.
   */
  put(key: string, value: JsonValue, expiry?: ExpiryPolicy): Promise<void>;
  put(
    dataOrKey: JsonValueObject | string,
    valueOrExpiry?: JsonValue | ExpiryPolicy,
    maybeExpiry?: ExpiryPolicy
  ): Promise<void> {
    if (typeof dataOrKey === "string") {
      const value = valueOrExpiry as JsonValue;
      const expiryEncoded = encodeExpiryPolicy(maybeExpiry);
      return this.proxy.withNativeVoid((native) =>
        native.dataLayerPutValue(
          this.proxy.instanceId,
          dataOrKey,
          serialize(value),
          expiryEncoded
        )
      );
    }

    const expiryEncoded = encodeExpiryPolicy(valueOrExpiry as ExpiryPolicy);
    return this.proxy.withNativeVoid((native) =>
      native.dataLayerPutData(
        this.proxy.instanceId,
        serialize(dataOrKey),
        expiryEncoded
      )
    );
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
    return this.proxy.withNativeVoid((native) =>
      native.dataLayerRemove(this.proxy.instanceId, serialize(keys))
    );
  }

  /** Removes every key from the data layer. */
  clear(): Promise<void> {
    return this.proxy.withNativeVoid((native) =>
      native.dataLayerClear(this.proxy.instanceId)
    );
  }
}
