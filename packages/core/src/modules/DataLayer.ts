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
   * fires. Resolves with a {@link Disposable} once native has registered the SDK
   * subscription: call `dispose()` to stop listening; disposing is idempotent.
   * The caller owns the returned handle and should dispose it when done, though
   * shutting down the instance also disposes any of its handles still open
   * (their `isDisposed` flips and updates stop). `listener` is wired up before
   * native is asked to subscribe, so an update that arrives before this Promise
   * resolves is still delivered. If the instance is shut down while the
   * registration is still in flight, this still resolves, but with a handle
   * whose `isDisposed` is already `true`.
   *
   * Rejects if the instance has been shut down (`INSTANCE_SHUT_DOWN`), the
   * native module is not registered (`NATIVE_MODULE_NOT_REGISTERED`), or native
   * found no instance for this id (`INSTANCE_NOT_FOUND`). No listener stays
   * registered when it rejects.
   */
  onDataUpdated(
    listener: (data: JsonValueObject) => void
  ): Promise<Disposable> {
    return this.proxy.withNative((native) =>
      subscribe({
        instanceId: this.proxy.instanceId,
        emitter: native.onDataUpdated,
        register: (subscriptionId) =>
          native.dataLayerSubscribeUpdated(
            this.proxy.instanceId,
            subscriptionId
          ),
        unregister: (subscriptionId) =>
          native.disposeSubscription(subscriptionId),
        onPayload: (payloadJson) =>
          listener(JSON.parse(payloadJson) as JsonValueObject),
      })
    );
  }
}
