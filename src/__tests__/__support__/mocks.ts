// Shared mock factories for the test suite. Each test file calls jest.mock()
// inline (Jest hoists factory literals, so the factory cannot be a closure
// over external state) and delegates the body to one of these functions.

/**
 * Factory for the NativeTealiumPrism TurboModule mock.
 * State-mutating Promise<void> methods default to mockResolvedValue(undefined)
 * so happy paths don't need per-test setup.
 */
export function makeNativeMock() {
  return {
    __esModule: true,
    default: {
      initialize: jest.fn(),
      shutdown: jest.fn().mockResolvedValue(undefined),
      isInitialized: jest.fn(),
      track: jest.fn(),
      flushEventQueue: jest.fn(),
      resetVisitorId: jest.fn(),
      clearStoredVisitorIds: jest.fn(),
      dataLayerPut: jest.fn().mockResolvedValue(undefined),
      dataLayerGetDataItem: jest.fn(),
      dataLayerGetDataList: jest.fn(),
      dataLayerGetDataObject: jest.fn(),
      dataLayerRemove: jest.fn().mockResolvedValue(undefined),
      dataLayerRemoveKeys: jest.fn().mockResolvedValue(undefined),
      dataLayerClear: jest.fn(),
      dataLayerGetAll: jest.fn(),
      dataLayerOnDataUpdatedSubscribe: jest.fn(),
      dataLayerOnDataUpdatedDispose: jest.fn(),
      dataLayerOnDataRemovedSubscribe: jest.fn(),
      dataLayerOnDataRemovedDispose: jest.fn(),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
      traceJoin: jest.fn().mockResolvedValue(undefined),
      traceLeave: jest.fn().mockResolvedValue(undefined),
      traceForceEndOfVisit: jest.fn().mockResolvedValue({
        status: 'accepted',
        info: '',
        dispatch: { id: 'uuid-1', timestamp: 1000, payload: {} },
      }),
      deepLinkHandle: jest.fn(),
      consentSetDecision: jest.fn().mockResolvedValue(undefined),
      consentGetDecision: jest.fn(),
      consentReset: jest.fn().mockResolvedValue(undefined),
      consentGetAllPurposes: jest.fn(),
      consentOnDecisionChangedSubscribe: jest.fn(),
      consentOnDecisionChangedDispose: jest.fn(),
    },
  };
}

/**
 * Factory for the react-native module mock. Each NativeEventEmitter instance
 * tracks its own per-event handler list so DataLayerAPI's listenerCount-based
 * ref counting works correctly, and tests can drive `_emit(eventName, payload)`
 * to simulate native→JS event delivery.
 */
export function makeReactNativeMock(nativeMockPath: string) {
  return {
    NativeEventEmitter: jest.fn().mockImplementation(() => {
      const handlers: Record<string, Array<(raw: unknown) => void>> = {};
      return {
        addListener: jest.fn(
          (eventName: string, handler: (raw: unknown) => void) => {
            (handlers[eventName] ??= []).push(handler);
            return {
              remove: jest.fn(() => {
                const arr = handlers[eventName];
                if (!arr) return;
                const idx = arr.indexOf(handler);
                if (idx >= 0) arr.splice(idx, 1);
              }),
            };
          }
        ),
        listenerCount: jest.fn(
          (eventName: string): number => handlers[eventName]?.length ?? 0
        ),
        removeAllListeners: jest.fn((eventName: string) => {
          handlers[eventName] = [];
        }),
        // Test-only escape hatch — invoked by event-delivery tests.
        _emit: (eventName: string, payload: unknown) => {
          (handlers[eventName] ?? []).forEach((h) => h(payload));
        },
      };
    }),
    TurboModuleRegistry: {
      getEnforcing: jest.fn(() => jest.requireMock(nativeMockPath).default),
    },
  };
}
