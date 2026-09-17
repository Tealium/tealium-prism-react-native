// Lifecycle tests for the DataLayer subscription router. The native side is
// mocked: we capture the single handler the router registers on the native
// `onDataUpdated` emitter and drive it directly, so these cover the JS-side
// contract (id minting, routing, idempotent dispose, event-after-dispose,
// unknown-id, failed registration) without a native build. Native-side ordering
// (unsubscribe- and shutdown-before-register) is covered by the native
// SubscriptionStore tests.
import { ErrorCode } from "../ErrorCode";
import type { Tealium as TealiumType } from "../Tealium";

type NativeEvent = { subscriptionId: string; payloadJson: string };

interface Harness {
  Tealium: typeof TealiumType;
  native: {
    create: jest.Mock;
    shutdown: jest.Mock;
    dataLayerSubscribeUpdated: jest.Mock;
    disposeSubscription: jest.Mock;
    onDataUpdated: jest.Mock;
  };
  /** Fires the captured native handler, as the real emitter would. */
  emit: (event: NativeEvent) => void;
  /** The subscriptionId from the most recent native subscribe call. */
  lastSubscriptionId: () => string;
}

// Fresh module graph per test so the module-level router (listeners map,
// attached-emitter set, id counter) starts clean each time.
async function setup(): Promise<Harness> {
  jest.resetModules();

  let capturedHandler: ((event: NativeEvent) => void) | undefined;
  let nextInstanceNumber = 0;
  const native = {
    create: jest.fn(() => `inst-${++nextInstanceNumber}`),
    shutdown: jest.fn(() => Promise.resolve()),
    // Native resolves once the SDK subscription is registered. Parameters are
    // declared (though unused) so `mock.calls` stays typed for the assertions.
    dataLayerSubscribeUpdated: jest.fn(
      (_instanceId: string, _subscriptionId: string) => Promise.resolve()
    ),
    disposeSubscription: jest.fn(),
    onDataUpdated: jest.fn((handler: (event: NativeEvent) => void) => {
      capturedHandler = handler;
      return { remove: jest.fn() };
    }),
  };

  jest.doMock("../NativeTealiumPrismReactNative", () => ({
    __esModule: true,
    default: native,
  }));

  const { Tealium } = await import("../Tealium");

  return {
    Tealium,
    native,
    emit: (event) => capturedHandler?.(event),
    lastSubscriptionId: () => {
      const calls = native.dataLayerSubscribeUpdated.mock.calls;
      const lastCall = calls[calls.length - 1];
      if (!lastCall) {
        throw new Error("native.dataLayerSubscribeUpdated was never called");
      }
      return lastCall[1];
    },
  };
}

describe("DataLayer.onDataUpdated", () => {
  it("mints a JS subscription id and registers it with native", async () => {
    const { Tealium, native } = await setup();
    const instance = Tealium.create("acct", "prof", "dev");

    await instance.dataLayer.onDataUpdated(jest.fn());

    expect(native.dataLayerSubscribeUpdated).toHaveBeenCalledTimes(1);
    const [instanceId, subscriptionId] =
      native.dataLayerSubscribeUpdated.mock.calls[0];
    expect(instanceId).toBe(instance.instanceId);
    expect(subscriptionId).toMatch(/^sub_\d+_inst_inst-1$/);
  });

  it("attaches the native emitter only once across subscriptions", async () => {
    const { Tealium, native } = await setup();
    const instance = Tealium.create("acct", "prof", "dev");

    await instance.dataLayer.onDataUpdated(jest.fn());
    await instance.dataLayer.onDataUpdated(jest.fn());

    expect(native.onDataUpdated).toHaveBeenCalledTimes(1);
    expect(native.dataLayerSubscribeUpdated).toHaveBeenCalledTimes(2);
  });

  it("routes each event to exactly the matching listener and parses the payload", async () => {
    const { Tealium, native, emit } = await setup();
    const instance = Tealium.create("acct", "prof", "dev");

    const listenerA = jest.fn();
    const listenerB = jest.fn();
    await instance.dataLayer.onDataUpdated(listenerA);
    const idA = native.dataLayerSubscribeUpdated.mock.calls[0][1] as string;
    await instance.dataLayer.onDataUpdated(listenerB);

    emit({ subscriptionId: idA, payloadJson: '{"user_id":"42","seen":true}' });

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerA).toHaveBeenCalledWith({ user_id: "42", seen: true });
    expect(listenerB).not.toHaveBeenCalled();
  });

  it("delivers an event that arrives before the register promise resolves", async () => {
    const { Tealium, native, emit, lastSubscriptionId } = await setup();
    let resolveRegister: (() => void) | undefined;
    native.dataLayerSubscribeUpdated.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveRegister = resolve;
        })
    );
    const instance = Tealium.create("acct", "prof", "dev");

    const listener = jest.fn();
    const pending = instance.dataLayer.onDataUpdated(listener);
    // Native has been asked to subscribe but has not confirmed yet.
    emit({ subscriptionId: lastSubscriptionId(), payloadJson: '{"early":1}' });

    expect(listener).toHaveBeenCalledWith({ early: 1 });

    resolveRegister?.();
    const subscription = await pending;
    expect(subscription.isDisposed).toBe(false);
  });

  it("is idempotent on dispose: unsubscribes native at most once and flips isDisposed", async () => {
    const { Tealium, native, lastSubscriptionId } = await setup();
    const instance = Tealium.create("acct", "prof", "dev");

    const subscription = await instance.dataLayer.onDataUpdated(jest.fn());
    const subscriptionId = lastSubscriptionId();
    expect(subscription.isDisposed).toBe(false);

    subscription.dispose();
    subscription.dispose();

    expect(subscription.isDisposed).toBe(true);
    expect(native.disposeSubscription).toHaveBeenCalledTimes(1);
    expect(native.disposeSubscription).toHaveBeenCalledWith(subscriptionId);
  });

  it("drops events delivered after dispose", async () => {
    const { Tealium, native, emit } = await setup();
    const instance = Tealium.create("acct", "prof", "dev");

    const listener = jest.fn();
    const subscription = await instance.dataLayer.onDataUpdated(listener);
    const subscriptionId = native.dataLayerSubscribeUpdated.mock
      .calls[0][1] as string;

    subscription.dispose();
    emit({ subscriptionId, payloadJson: '{"late":true}' });

    expect(listener).not.toHaveBeenCalled();
  });

  it("ignores events for an unknown subscription id", async () => {
    const { Tealium, emit } = await setup();
    const instance = Tealium.create("acct", "prof", "dev");

    const listener = jest.fn();
    await instance.dataLayer.onDataUpdated(listener);

    expect(() =>
      emit({ subscriptionId: "sub_999_inst_other", payloadJson: "{}" })
    ).not.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });

  it("disposes outstanding handles on shutdown, without a per-subscription native unsubscribe", async () => {
    const { Tealium, native, emit, lastSubscriptionId } = await setup();
    const instance = Tealium.create("acct", "prof", "dev");

    const listener = jest.fn();
    const subscription = await instance.dataLayer.onDataUpdated(listener);
    const subscriptionId = lastSubscriptionId();
    expect(subscription.isDisposed).toBe(false);

    await instance.shutdown();

    expect(subscription.isDisposed).toBe(true);
    // Native tears the SDK subscription down as part of shutdown, so the router
    // must not issue a redundant per-subscription unregister.
    expect(native.disposeSubscription).not.toHaveBeenCalled();

    // Routing state is purged: a late event for the id no longer reaches JS.
    emit({ subscriptionId, payloadJson: '{"late":true}' });
    expect(listener).not.toHaveBeenCalled();
  });

  it("shutting down one instance leaves another instance's subscription active", async () => {
    const { Tealium, native, emit } = await setup();
    const instanceA = Tealium.create("acctA", "prof", "dev");
    const instanceB = Tealium.create("acctB", "prof", "dev");

    const listenerA = jest.fn();
    const listenerB = jest.fn();
    const subscriptionA = await instanceA.dataLayer.onDataUpdated(listenerA);
    const idA = native.dataLayerSubscribeUpdated.mock.calls[0][1] as string;
    const subscriptionB = await instanceB.dataLayer.onDataUpdated(listenerB);
    const idB = native.dataLayerSubscribeUpdated.mock.calls[1][1] as string;

    await instanceA.shutdown();

    expect(subscriptionA.isDisposed).toBe(true);
    expect(subscriptionB.isDisposed).toBe(false);

    emit({ subscriptionId: idA, payloadJson: "{}" });
    emit({ subscriptionId: idB, payloadJson: '{"ok":true}' });

    expect(listenerA).not.toHaveBeenCalled();
    expect(listenerB).toHaveBeenCalledWith({ ok: true });
  });

  it("resolves with an already-disposed handle when shutdown races the registration", async () => {
    const { Tealium, native } = await setup();
    let resolveRegister: (() => void) | undefined;
    native.dataLayerSubscribeUpdated.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveRegister = resolve;
        })
    );
    const instance = Tealium.create("acct", "prof", "dev");

    const pending = instance.dataLayer.onDataUpdated(jest.fn());
    await instance.shutdown();
    resolveRegister?.();

    const subscription = await pending;
    expect(subscription.isDisposed).toBe(true);
    // Shutdown relies on native's own disposeAll, so no per-subscription
    // unregister is issued for the handle it purged.
    expect(native.disposeSubscription).not.toHaveBeenCalled();
  });

  it("rejects with INSTANCE_SHUT_DOWN when subscribing after shutdown", async () => {
    const { Tealium, native } = await setup();
    const instance = Tealium.create("acct", "prof", "dev");

    await instance.shutdown();

    await expect(instance.dataLayer.onDataUpdated(jest.fn())).rejects.toEqual(
      expect.objectContaining({ code: ErrorCode.INSTANCE_SHUT_DOWN })
    );
    // The guard runs before any routing state or native call.
    expect(native.dataLayerSubscribeUpdated).not.toHaveBeenCalled();
  });

  it("propagates a native registration failure and leaves no listener behind", async () => {
    const { Tealium, native, emit, lastSubscriptionId } = await setup();
    const notFound = Object.assign(new Error("No Tealium instance"), {
      code: ErrorCode.INSTANCE_NOT_FOUND,
    });
    native.dataLayerSubscribeUpdated.mockRejectedValueOnce(notFound);
    const instance = Tealium.create("acct", "prof", "dev");

    const listener = jest.fn();
    // The handle is never handed out on this path, so the router's teardown is
    // asserted through its observable effects: no native unregister for a
    // subscription native never opened, and no routing left for the id.
    await expect(instance.dataLayer.onDataUpdated(listener)).rejects.toBe(
      notFound
    );

    const subscriptionId = lastSubscriptionId();
    expect(native.disposeSubscription).not.toHaveBeenCalled();
    emit({ subscriptionId, payloadJson: '{"orphan":true}' });
    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps a later subscription working after a failed registration", async () => {
    const { Tealium, native, emit, lastSubscriptionId } = await setup();
    native.dataLayerSubscribeUpdated.mockRejectedValueOnce(
      new Error("INSTANCE_NOT_FOUND")
    );
    const instance = Tealium.create("acct", "prof", "dev");

    await expect(instance.dataLayer.onDataUpdated(jest.fn())).rejects.toThrow(
      "INSTANCE_NOT_FOUND"
    );

    const listener = jest.fn();
    const subscription = await instance.dataLayer.onDataUpdated(listener);
    emit({ subscriptionId: lastSubscriptionId(), payloadJson: '{"ok":true}' });

    expect(subscription.isDisposed).toBe(false);
    expect(listener).toHaveBeenCalledWith({ ok: true });
  });
});
