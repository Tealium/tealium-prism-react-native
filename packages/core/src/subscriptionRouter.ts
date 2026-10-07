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
// Live (not-yet-disposed) handles grouped by owning instance so
// `disposeInstanceSubscriptions` can purge them on `Tealium.shutdown()`. Native
// disposes its own SDK subscriptions on shutdown but echoes no completion back
// to JS, so without this the `listeners` closures — and everything they
// capture — would outlive the instance and `isDisposed` would never flip.
const handlesByInstance = new Map<string, Set<RoutedSubscription>>();
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
 * are no-ops. `isDisposed` flips on the first teardown, whether that is a
 * caller {@link dispose} or a {@link disposeInstanceSubscriptions} on shutdown.
 */
class RoutedSubscription implements Disposable {
  private _isDisposed = false;

  constructor(
    private readonly subscriptionId: string,
    private readonly instanceId: string,
    private readonly unregister: (subscriptionId: string) => void
  ) {}

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this.forget();
    this.unregister(this.subscriptionId);
  }

  /**
   * @internal Drops this handle's JS routing state — its `listeners` entry and
   * its slot in {@link handlesByInstance} — and flips `isDisposed`, at most
   * once. Deliberately does not touch native: callers that need the native
   * subscription torn down do that themselves ({@link dispose}), while shutdown
   * relies on native having already disposed it and a failed registration (see
   * {@link subscribe}) has no native subscription to release in the first place.
   */
  forget(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    listeners.delete(this.subscriptionId);
    const siblings = handlesByInstance.get(this.instanceId);
    if (siblings) {
      siblings.delete(this);
      if (siblings.size === 0) {
        handlesByInstance.delete(this.instanceId);
      }
    }
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
  /**
   * Tells native to open the SDK subscription tagged with `subscriptionId`.
   * Resolves once native has registered it and rejects when it could not (e.g.
   * `INSTANCE_NOT_FOUND`); {@link subscribe} propagates that rejection.
   */
  register: (subscriptionId: string) => Promise<void>;
  /** Tells native to tear down the SDK subscription for `subscriptionId`. */
  unregister: (subscriptionId: string) => void;
  /** Invoked with the raw `payloadJson` for each routed event. */
  onPayload: PayloadListener;
}

/**
 * Opens a routed subscription: mints an opaque `subscriptionId`, registers the
 * listener and its handle before asking native to subscribe (so an event that
 * arrives before the returned Promise settles is still routed), and resolves
 * with a {@link Disposable}. The `subscriptionId` is the correlation token
 * native echoes back on every event and the key `unregister` uses.
 *
 * If `register` fails — synchronously or by rejecting — the subscription never
 * opened natively, so the routing state added above is dropped again, the handle
 * is marked disposed without a native `unregister`, and the original error is
 * re-thrown to the caller.
 */
export function subscribe(params: SubscribeParams): Promise<Disposable> {
  const { instanceId, emitter, register, unregister, onPayload } = params;

  attachEmitterOnce(emitter);

  const subscriptionId = `sub_${++nextSubscriptionId}_inst_${instanceId}`;
  listeners.set(subscriptionId, onPayload);

  const subscription = new RoutedSubscription(
    subscriptionId,
    instanceId,
    unregister
  );
  const siblings = handlesByInstance.get(instanceId);
  if (siblings) {
    siblings.add(subscription);
  } else {
    handlesByInstance.set(instanceId, new Set([subscription]));
  }

  try {
    return register(subscriptionId).then(
      () => subscription,
      (error: unknown) => {
        subscription.forget();
        throw error;
      }
    );
  } catch (error) {
    subscription.forget();
    return Promise.reject(error);
  }
}

/**
 * Disposes every routed subscription still open for `instanceId`, dropping its
 * JS routing state and flipping each handle's `isDisposed`, without a native
 * unregister: {@link Tealium.shutdown} has already asked native to dispose the
 * instance's SDK subscriptions, and native sends no completion back, so this
 * only drops the JS routing state native left dangling (see
 * {@link handlesByInstance}). Ensures a caller that never disposed its handles
 * does not leak their listener closures once the instance is gone. Idempotent
 * and a no-op for an instance with no open subscriptions.
 */
export function disposeInstanceSubscriptions(instanceId: string): void {
  const handles = handlesByInstance.get(instanceId);
  if (!handles) {
    return;
  }
  // Copy first: forget() removes each handle from this set as it runs.
  for (const handle of [...handles]) {
    handle.forget();
  }
}
