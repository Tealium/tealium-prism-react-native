import Tealium from '../index';
import {
  getMockNative,
  resetTealiumState,
  restoreDefaultResolves,
} from './__support__/helpers';

jest.mock('../NativeTealiumPrismReactNative', () =>
  jest.requireActual('./__support__/mocks').makeNativeMock()
);
jest.mock('react-native', () =>
  jest
    .requireActual('./__support__/mocks')
    .makeReactNativeMock('../NativeTealiumPrismReactNative')
);

const mockNative = getMockNative();

beforeEach(() => {
  jest.clearAllMocks();
  restoreDefaultResolves(mockNative);
  resetTealiumState();
});

// Cross-cutting tests covering native→JS event payload delivery via the
// NativeEventEmitter. The mock emitter exposes a test-only `_emit(eventName,
// payload)` hook that fires every registered handler — same shape as the
// native side calls when subscribing through TealiumPrismBridge.

describe('Event delivery', () => {
  it('delivers onDataUpdated payload to JS callback', () => {
    const cb = jest.fn();
    Tealium.dataLayer.onDataUpdated(cb);

    const emitter = (Tealium.dataLayer as any).eventEmitter;
    const payload = { user_id: '123', flag: true };
    emitter._emit('TealiumDataLayerUpdated', payload);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(payload);
  });

  it('delivers onDataRemoved keys (unwrapping the {keys} envelope)', () => {
    const cb = jest.fn();
    Tealium.dataLayer.onDataRemoved(cb);

    const emitter = (Tealium.dataLayer as any).eventEmitter;
    emitter._emit('TealiumDataLayerRemoved', { keys: ['a', 'b'] });

    expect(cb).toHaveBeenCalledWith(['a', 'b']);
  });

  it('delivers onDecisionChanged decision (unwrapping the {decision} envelope)', () => {
    const cb = jest.fn();
    Tealium.consent.onDecisionChanged(cb);

    const emitter = (Tealium.consent as any).eventEmitter;
    const decision = { decisionType: 'explicit', purposes: ['analytics'] };
    emitter._emit('TealiumConsentDecisionChanged', { decision });

    expect(cb).toHaveBeenCalledWith(decision);
  });

  it('delivers null decision after reset', () => {
    const cb = jest.fn();
    Tealium.consent.onDecisionChanged(cb);

    const emitter = (Tealium.consent as any).eventEmitter;
    emitter._emit('TealiumConsentDecisionChanged', { decision: null });

    expect(cb).toHaveBeenCalledWith(null);
  });

  it('does not deliver to a disposed subscriber', () => {
    const cb = jest.fn();
    const sub = Tealium.dataLayer.onDataUpdated(cb);
    sub.dispose();

    const emitter = (Tealium.dataLayer as any).eventEmitter;
    emitter._emit('TealiumDataLayerUpdated', { x: 1 });

    expect(cb).not.toHaveBeenCalled();
  });
});
