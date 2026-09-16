import type { ModuleProxy } from "./ModuleProxy";
import type { Disposable, JsonValueObject } from "../types";
import { subscribe } from "../subscriptionRouter";

/**
 * DataLayer subscriptions. Mirrors the native Prism `DataLayer` module
 * (prism-swift `DataLayer` protocol, prism-kotlin `DataLayer` interface).
 * Reached via {@link Tealium.dataLayer}.
 */
export class DataLayer {
  /** @internal Constructed by {@link Tealium}; not part of the public API. */
  constructor(private readonly proxy: ModuleProxy) {}

  /**
   * Subscribes to data-layer updates. `listener` is called with the delta —
   * only the keys that changed — each time the SDK's `onDataUpdated` stream
   * fires. Returns a {@link Disposable}: call `dispose()` to stop listening;
   * disposing is idempotent. The caller owns the returned handle and should
   * dispose it when done. Shutting down the instance stops its updates but does
   * not dispose the handle.
   *
   * @throws if the instance has been shut down (`INSTANCE_SHUT_DOWN`) or the
   *   native module is not registered (`NATIVE_MODULE_NOT_REGISTERED`).
   */
  onDataUpdated(listener: (data: JsonValueObject) => void): Disposable {
    const native = this.proxy.getNative();
    return subscribe({
      instanceId: this.proxy.instanceId,
      emitter: native.onDataUpdated,
      register: (subscriptionId) =>
        native.dataLayerSubscribeUpdated(this.proxy.instanceId, subscriptionId),
      unregister: (subscriptionId) =>
        native.disposeSubscription(subscriptionId),
      onPayload: (payloadJson) =>
        listener(JSON.parse(payloadJson) as JsonValueObject),
    });
  }
}
