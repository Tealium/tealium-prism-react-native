import type { CodegenTypes } from "react-native";
import type { SubscriptionEmission } from "./NativeTealiumPrismReactNative";
import type { Disposable } from "./types";

type PayloadListener = (payloadJson: string) => void;

// Module-level router shared by every Tealium instance and every DataLayer
// stream. The native side owns a single EventEmitter per stream (e.g.
// onDataUpdated) that multiplexes all instances and listeners; each event
// carries the `subscriptionId` we minted so we can route it back to one
// listener. Keeping this module-level (not per-instance) means we attach to
// each native emitter exactly once, not once per subscription.
const listeners = new Map<string, PayloadListener>();
const attachedEmitters = new WeakSet<
  CodegenTypes.EventEmitter<SubscriptionEmission>
>();
let nextSubscriptionId = 0;

/** Routes one native event to its listener, or drops it if none is registered. */
function dispatch(event: SubscriptionEmission): void {
  listeners.get(event.subscriptionId)?.(event.payloadJson);
}

// TODO: When E2E tests are added, verify that attaching emitters once works correctly across multiple instances and subscriptions.
/**
 * Wires {@link dispatch} to a native emitter the first time that emitter is
 * seen, keyed by the emitter reference itself. On the New Architecture a
 * TurboModule memoizes each `EventEmitter` property onto its JS representation,
 * so `native.onDataUpdated` is a stable reference across accesses and a safe
 * dedup key — with no separate name to keep in sync with the emitter it labels.
 * Later subscriptions on the same stream reuse the one handler. The returned
 * `EventSubscription` is intentionally never removed: the emitter lives for the
 * app's lifetime and routing is by `subscriptionId`, so removing it would
 * silence every other listener on the stream.
 */
function attachEmitterOnce(
  emitter: CodegenTypes.EventEmitter<SubscriptionEmission>
): void {
  if (attachedEmitters.has(emitter)) {
    return;
  }
  attachedEmitters.add(emitter);
  emitter(dispatch);
}

/**
 * One listener's handle. Idempotent: the first {@link dispose} removes the JS
 * listener and unregisters the native subscription (at most once); later calls
 * are no-ops. `isDisposed` flips on the first dispose.
 */
class RoutedSubscription implements Disposable {
  private _isDisposed = false;

  constructor(
    private readonly subscriptionId: string,
    private readonly unregister: (subscriptionId: string) => void
  ) {}

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    listeners.delete(this.subscriptionId);
    this.unregister(this.subscriptionId);
  }
}

/** Everything a module supplies to open one routed subscription. */
export interface SubscribeParams {
  /** Owning instance id — folded into the subscription id for traceability. */
  instanceId: string;
  /**
   * The generated native EventEmitter for this stream. Its reference is the
   * key used to attach the stream exactly once (see {@link subscribe}).
   */
  emitter: CodegenTypes.EventEmitter<SubscriptionEmission>;
  /** Tells native to open the SDK subscription tagged with `subscriptionId`. */
  register: (subscriptionId: string) => void;
  /** Tells native to tear down the SDK subscription for `subscriptionId`. */
  unregister: (subscriptionId: string) => void;
  /** Invoked with the raw `payloadJson` for each routed event. */
  onPayload: PayloadListener;
}

/**
 * Opens a routed subscription: mints an opaque `subscriptionId`, registers the
 * listener before asking native to subscribe (so no early event is missed), and
 * returns a {@link Disposable}. The `subscriptionId` is the correlation token
 * native echoes back on every event and the key `unregister` uses.
 */
export function subscribe(params: SubscribeParams): Disposable {
  const { instanceId, emitter, register, unregister, onPayload } = params;

  attachEmitterOnce(emitter);

  const subscriptionId = `sub_${++nextSubscriptionId}_inst_${instanceId}`;
  listeners.set(subscriptionId, onPayload);
  register(subscriptionId);

  return new RoutedSubscription(subscriptionId, unregister);
}
