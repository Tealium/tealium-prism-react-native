// Lifecycle tests for the DataLayer subscription router. The native side is
// mocked: we capture the single handler the router registers on the native
// `onDataUpdated` emitter and drive it directly, so these cover the JS-side
// contract (id minting, routing, idempotent dispose, event-after-dispose,
// unknown-id) without a native build. Native-side ordering (unsubscribe- and
// shutdown-before-register) is covered by the native SubscriptionStore tests.
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
  const native = {
    create: jest.fn(() => "inst-1"),
    shutdown: jest.fn(() => Promise.resolve()),
    dataLayerSubscribeUpdated: jest.fn(),
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
      return calls[calls.length - 1][1] as string;
    },
  };
}

describe("DataLayer.onDataUpdated", () => {
  it("mints a JS subscription id and registers it with native", async () => {
    const { Tealium, native } = await setup();
    const instance = Tealium.create("acct", "prof", "dev");

    instance.dataLayer.onDataUpdated(jest.fn());

    expect(native.dataLayerSubscribeUpdated).toHaveBeenCalledTimes(1);
    const [instanceId, subscriptionId] =
      native.dataLayerSubscribeUpdated.mock.calls[0];
    expect(instanceId).toBe(instance.instanceId);
    expect(subscriptionId).toMatch(/^sub_\d+_inst_inst-1$/);
  });

  it("attaches the native emitter only once across subscriptions", async () => {
    const { Tealium, native } = await setup();
    const instance = Tealium.create("acct", "prof", "dev");

    instance.dataLayer.onDataUpdated(jest.fn());
    instance.dataLayer.onDataUpdated(jest.fn());

    expect(native.onDataUpdated).toHaveBeenCalledTimes(1);
    expect(native.dataLayerSubscribeUpdated).toHaveBeenCalledTimes(2);
  });

  it("routes each event to exactly the matching listener and parses the payload", async () => {
    const { Tealium, native, emit } = await setup();
    const instance = Tealium.create("acct", "prof", "dev");

    const listenerA = jest.fn();
    const listenerB = jest.fn();
    instance.dataLayer.onDataUpdated(listenerA);
    const idA = native.dataLayerSubscribeUpdated.mock.calls[0][1] as string;
    instance.dataLayer.onDataUpdated(listenerB);

    emit({ subscriptionId: idA, payloadJson: '{"user_id":"42","seen":true}' });

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerA).toHaveBeenCalledWith({ user_id: "42", seen: true });
    expect(listenerB).not.toHaveBeenCalled();
  });

  it("is idempotent on dispose: unsubscribes native at most once and flips isDisposed", async () => {
    const { Tealium, native, lastSubscriptionId } = await setup();
    const instance = Tealium.create("acct", "prof", "dev");

    const subscription = instance.dataLayer.onDataUpdated(jest.fn());
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
    const subscription = instance.dataLayer.onDataUpdated(listener);
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
    instance.dataLayer.onDataUpdated(listener);

    expect(() =>
      emit({ subscriptionId: "sub_999_inst_other", payloadJson: "{}" })
    ).not.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });

  it("throws INSTANCE_SHUT_DOWN when subscribing after shutdown", async () => {
    const { Tealium } = await setup();
    const instance = Tealium.create("acct", "prof", "dev");

    await instance.shutdown();

    expect(() => instance.dataLayer.onDataUpdated(jest.fn())).toThrow(
      expect.objectContaining({ code: ErrorCode.INSTANCE_SHUT_DOWN })
    );
  });
});
