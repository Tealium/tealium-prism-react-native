import Tealium from '../index';

// ─── Native module mock ───────────────────────────────────────────────────────
// jest.mock() factories are hoisted, so mocks are defined inline and retrieved
// via jest.requireMock() after module load.

jest.mock('../NativeTealiumPrismReactNative', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    shutdown: jest.fn(),
    isInitialized: jest.fn(),
    track: jest.fn(),
    flushEventQueue: jest.fn(),
    resetVisitorId: jest.fn(),
    clearStoredVisitorIds: jest.fn(),
    dataLayerPut: jest.fn(),
    dataLayerGetDataItem: jest.fn(),
    dataLayerGetDataList: jest.fn(),
    dataLayerGetDataObject: jest.fn(),
    dataLayerRemove: jest.fn(),
    dataLayerRemoveKeys: jest.fn(),
    dataLayerClear: jest.fn(),
    dataLayerGetAll: jest.fn(),
    dataLayerOnDataUpdatedSubscribe: jest.fn(),
    dataLayerOnDataUpdatedDispose: jest.fn(),
    dataLayerOnDataRemovedSubscribe: jest.fn(),
    dataLayerOnDataRemovedDispose: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    traceJoin: jest.fn(),
    traceLeave: jest.fn(),
    traceForceEndOfVisit: jest.fn(),
    deepLinkHandle: jest.fn(),
    consentSetDecision: jest.fn(),
    consentGetDecision: jest.fn(),
    consentReset: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  // Each NativeEventEmitter instance owns its own per-event counts so
  // DataLayerAPI's listenerCount-based ref counting behaves as it would at
  // runtime. State resets when DataLayerAPI is re-created via shutdown().
  NativeEventEmitter: jest.fn().mockImplementation(() => {
    const counts: Record<string, number> = {};
    return {
      addListener: jest.fn((eventName: string) => {
        counts[eventName] = (counts[eventName] ?? 0) + 1;
        return {
          remove: jest.fn(() => {
            counts[eventName] = Math.max(0, (counts[eventName] ?? 0) - 1);
          }),
        };
      }),
      listenerCount: jest.fn(
        (eventName: string): number => counts[eventName] ?? 0
      ),
      removeAllListeners: jest.fn((eventName: string) => {
        counts[eventName] = 0;
      }),
    };
  }),
  TurboModuleRegistry: {
    getEnforcing: jest.fn(
      () => jest.requireMock('../NativeTealiumPrismReactNative').default
    ),
  },
}));

// Typed reference retrieved after mocks are established.
const mockNative: jest.Mocked<
  typeof import('../NativeTealiumPrismReactNative').default
> = jest.requireMock('../NativeTealiumPrismReactNative').default;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE_CONFIG = {
  account: 'acct',
  profile: 'profile',
  environment: 'dev' as const,
};

function resetTealiumState() {
  // Reset private static state between tests.
  (Tealium as any)._initialized = false;
  (Tealium as any)._dataLayer = null;
  (Tealium as any)._trace = null;
  (Tealium as any)._deepLink = null;
  (Tealium as any)._consent = null;

  // The module-level NativeEventEmitter instance is shared across tests; clear
  // its per-event listener counts so each test starts at 0.
  const fresh = Tealium.dataLayer as any;
  fresh.eventEmitter.removeAllListeners('TealiumDataLayerUpdated');
  fresh.eventEmitter.removeAllListeners('TealiumDataLayerRemoved');
  (Tealium as any)._dataLayer = null;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  resetTealiumState();
});

// ── Tealium.create ────────────────────────────────────────────────────────────

describe('Tealium.create', () => {
  it('calls native initialize and returns true on success', async () => {
    mockNative.initialize.mockResolvedValue(true);

    const result = await Tealium.create(BASE_CONFIG);

    expect(mockNative.initialize).toHaveBeenCalledTimes(1);
    expect(mockNative.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        account: 'acct',
        profile: 'profile',
        environment: 'dev',
      })
    );
    expect(result).toBe(true);
    expect(Tealium.isReady).toBe(true);
  });

  it('sets plugin_name and plugin_version in data layer after init', async () => {
    mockNative.initialize.mockResolvedValue(true);

    await Tealium.create(BASE_CONFIG);

    expect(mockNative.dataLayerPut).toHaveBeenCalledWith(
      {
        plugin_name: 'Tealium-Prism-ReactNative',
        plugin_version: expect.any(String),
      },
      'forever'
    );
  });

  it('returns false and leaves isReady=false when native init fails', async () => {
    mockNative.initialize.mockResolvedValue(false);

    const result = await Tealium.create(BASE_CONFIG);

    expect(result).toBe(false);
    expect(Tealium.isReady).toBe(false);
  });

  it('maps cmpAdapter into nested spec object', async () => {
    mockNative.initialize.mockResolvedValue(true);

    await Tealium.create({
      ...BASE_CONFIG,
      cmpAdapter: {
        id: 'my-cmp',
        allPurposes: ['analytics', 'marketing'],
        defaultDecision: { decisionType: 'implicit', purposes: ['analytics'] },
      },
    });

    expect(mockNative.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        cmpAdapter: {
          id: 'my-cmp',
          allPurposes: ['analytics', 'marketing'],
          defaultDecisionType: 'implicit',
          defaultPurposes: ['analytics'],
        },
      })
    );
  });

  it('uses react-native-bridge as default cmpAdapter id when id is absent', async () => {
    mockNative.initialize.mockResolvedValue(true);

    await Tealium.create({
      ...BASE_CONFIG,
      cmpAdapter: { allPurposes: ['analytics'] },
    });

    expect(mockNative.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        cmpAdapter: expect.objectContaining({ id: 'react-native-bridge' }),
      })
    );
  });
});

// ── Tealium.shutdown ──────────────────────────────────────────────────────────

describe('Tealium.shutdown', () => {
  it('calls native shutdown and resets isReady', async () => {
    mockNative.initialize.mockResolvedValue(true);
    await Tealium.create(BASE_CONFIG);

    Tealium.shutdown();

    expect(mockNative.shutdown).toHaveBeenCalledTimes(1);
    expect(Tealium.isReady).toBe(false);
  });

  it('nullifies sub-API instances after shutdown', async () => {
    mockNative.initialize.mockResolvedValue(true);
    await Tealium.create(BASE_CONFIG);
    const dlBefore = Tealium.dataLayer;

    Tealium.shutdown();

    // After shutdown each getter creates a fresh instance.
    expect(Tealium.dataLayer).not.toBe(dlBefore);
  });
});

// ── Tealium.isInitialized ─────────────────────────────────────────────────────

describe('Tealium.isInitialized', () => {
  it('returns native value and syncs isReady', async () => {
    mockNative.isInitialized.mockResolvedValue(true);

    const result = await Tealium.isInitialized();

    expect(result).toBe(true);
    expect(Tealium.isReady).toBe(true);
  });
});

// ── Tealium.track ─────────────────────────────────────────────────────────────

describe('Tealium.track', () => {
  it('calls native track with correct shape', async () => {
    mockNative.track.mockResolvedValue(undefined);

    await Tealium.track('button_click', 'event', { button_id: 'submit' });

    expect(mockNative.track).toHaveBeenCalledWith({
      name: 'button_click',
      type: 'event',
      data: { button_id: 'submit' },
    });
  });

  it('defaults type to event', async () => {
    mockNative.track.mockResolvedValue(undefined);

    await Tealium.track('page_view');

    expect(mockNative.track).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'event' })
    );
  });
});

// ── DataLayerAPI.put ──────────────────────────────────────────────────────────

describe('DataLayerAPI.put', () => {
  it('forwards the whole record and expiry to dataLayerPut', () => {
    Tealium.dataLayer.put({ user_type: 'premium', count: 42 }, 'session');

    expect(mockNative.dataLayerPut).toHaveBeenCalledTimes(1);
    expect(mockNative.dataLayerPut).toHaveBeenCalledWith(
      { user_type: 'premium', count: 42 },
      'session'
    );
  });

  it("defaults expiry to 'forever' when omitted", () => {
    Tealium.dataLayer.put({ flag: true });

    expect(mockNative.dataLayerPut).toHaveBeenCalledWith(
      { flag: true },
      'forever'
    );
  });

  it('forwards mixed-type arrays intact', () => {
    Tealium.dataLayer.put({ mixed: [1, 'two', true] } as any);

    expect(mockNative.dataLayerPut).toHaveBeenCalledWith(
      { mixed: [1, 'two', true] },
      'forever'
    );
  });

  it('forwards null values without warning (null is a valid JSON value)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    Tealium.dataLayer.put({ nullable: null, ok: 'x' });

    expect(warn).not.toHaveBeenCalled();
    expect(mockNative.dataLayerPut).toHaveBeenCalledWith(
      { nullable: null, ok: 'x' },
      'forever'
    );
    warn.mockRestore();
  });
});

// ── DataLayerAPI.remove ───────────────────────────────────────────────────────

describe('DataLayerAPI.remove', () => {
  it('calls dataLayerRemove for single key', () => {
    Tealium.dataLayer.remove('user_id');

    expect(mockNative.dataLayerRemove).toHaveBeenCalledWith('user_id');
  });

  it('calls dataLayerRemoveKeys for array of keys', () => {
    Tealium.dataLayer.remove(['user_id', 'user_type']);

    expect(mockNative.dataLayerRemoveKeys).toHaveBeenCalledWith([
      'user_id',
      'user_type',
    ]);
  });
});

// ── DataLayerAPI typed getters ────────────────────────────────────────────────

describe('DataLayerAPI typed getters', () => {
  it('getDataItem forwards to dataLayerGetDataItem', async () => {
    mockNative.dataLayerGetDataItem.mockResolvedValue({
      type: 'string',
      value: 'hello',
    });

    const result = await Tealium.dataLayer.getDataItem('greeting');

    expect(mockNative.dataLayerGetDataItem).toHaveBeenCalledWith('greeting');
    expect(result).toEqual({ type: 'string', value: 'hello' });
  });

  it('getDataList forwards to dataLayerGetDataList and returns the array', async () => {
    const list = [
      { type: 'number', value: 1 },
      { type: 'number', value: 2 },
    ];
    mockNative.dataLayerGetDataList.mockResolvedValue(list);

    const result = await Tealium.dataLayer.getDataList('nums');

    expect(mockNative.dataLayerGetDataList).toHaveBeenCalledWith('nums');
    expect(result).toEqual(list);
  });

  it('getDataList returns null when native returns null', async () => {
    mockNative.dataLayerGetDataList.mockResolvedValue(null as any);

    const result = await Tealium.dataLayer.getDataList('notAList');

    expect(result).toBeNull();
  });

  it('getDataObject forwards to dataLayerGetDataObject and returns the map', async () => {
    const obj = {
      a: { type: 'string', value: 'x' },
      b: { type: 'boolean', value: true },
    };
    mockNative.dataLayerGetDataObject.mockResolvedValue(obj);

    const result = await Tealium.dataLayer.getDataObject('config');

    expect(mockNative.dataLayerGetDataObject).toHaveBeenCalledWith('config');
    expect(result).toEqual(obj);
  });

  it('getDataObject returns null when native returns null', async () => {
    mockNative.dataLayerGetDataObject.mockResolvedValue(null as any);

    const result = await Tealium.dataLayer.getDataObject('notAnObject');

    expect(result).toBeNull();
  });
});

// ── DataLayerAPI events ───────────────────────────────────────────────────────

describe('DataLayerAPI event subscriptions', () => {
  it('subscribes to native onDataUpdated when first listener is added', () => {
    Tealium.dataLayer.onDataUpdated(() => {});

    expect(mockNative.dataLayerOnDataUpdatedSubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not re-subscribe for a second onDataUpdated listener', () => {
    Tealium.dataLayer.onDataUpdated(() => {});
    Tealium.dataLayer.onDataUpdated(() => {});

    expect(mockNative.dataLayerOnDataUpdatedSubscribe).toHaveBeenCalledTimes(1);
  });

  it('disposes native onDataUpdated when last listener is disposed', () => {
    const sub = Tealium.dataLayer.onDataUpdated(() => {});
    sub.dispose();

    expect(mockNative.dataLayerOnDataUpdatedDispose).toHaveBeenCalledTimes(1);
  });

  it('does not dispose while other onDataUpdated listeners remain', () => {
    const sub1 = Tealium.dataLayer.onDataUpdated(() => {});
    Tealium.dataLayer.onDataUpdated(() => {});
    sub1.dispose();

    expect(mockNative.dataLayerOnDataUpdatedDispose).not.toHaveBeenCalled();
  });

  it('dispose() is idempotent and reflects in isDisposed', () => {
    const sub = Tealium.dataLayer.onDataUpdated(() => {});
    expect(sub.isDisposed).toBe(false);

    sub.dispose();
    expect(sub.isDisposed).toBe(true);

    sub.dispose();
    expect(mockNative.dataLayerOnDataUpdatedDispose).toHaveBeenCalledTimes(1);
  });

  it('keeps onDataUpdated and onDataRemoved ref counts independent', () => {
    Tealium.dataLayer.onDataRemoved(() => {});

    // Subscribing only to onDataRemoved must not activate the updated stream.
    expect(mockNative.dataLayerOnDataUpdatedSubscribe).not.toHaveBeenCalled();
    expect(mockNative.dataLayerOnDataRemovedSubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not cross-dispose streams', () => {
    const sub1 = Tealium.dataLayer.onDataUpdated(() => {});
    Tealium.dataLayer.onDataRemoved(() => {});

    sub1.dispose();

    expect(mockNative.dataLayerOnDataUpdatedDispose).toHaveBeenCalledTimes(1);
    expect(mockNative.dataLayerOnDataRemovedDispose).not.toHaveBeenCalled();
  });
});

// ── TraceAPI ──────────────────────────────────────────────────────────────────

describe('TraceAPI', () => {
  it('join calls native traceJoin', () => {
    Tealium.trace.join('abc123');

    expect(mockNative.traceJoin).toHaveBeenCalledWith('abc123');
  });

  it('leave calls native traceLeave', () => {
    Tealium.trace.leave();

    expect(mockNative.traceLeave).toHaveBeenCalled();
  });

  it('forceEndOfVisit calls native traceForceEndOfVisit', () => {
    Tealium.trace.forceEndOfVisit();

    expect(mockNative.traceForceEndOfVisit).toHaveBeenCalled();
  });
});

// ── DeepLinkAPI ───────────────────────────────────────────────────────────────

describe('DeepLinkAPI', () => {
  it('passes url and null referrer by default', async () => {
    mockNative.deepLinkHandle.mockResolvedValue(true);

    const result = await Tealium.deepLink.handle('myapp://product/123');

    expect(mockNative.deepLinkHandle).toHaveBeenCalledWith(
      'myapp://product/123',
      null
    );
    expect(result).toBe(true);
  });

  it('passes referrer when provided', async () => {
    mockNative.deepLinkHandle.mockResolvedValue(true);

    await Tealium.deepLink.handle('myapp://x', 'https://referrer.com');

    expect(mockNative.deepLinkHandle).toHaveBeenCalledWith(
      'myapp://x',
      'https://referrer.com'
    );
  });
});

// ── ConsentAPI ────────────────────────────────────────────────────────────────

describe('ConsentAPI', () => {
  it('setDecision calls native consentSetDecision', () => {
    Tealium.consent.setDecision('explicit', ['analytics', 'marketing']);

    expect(mockNative.consentSetDecision).toHaveBeenCalledWith('explicit', [
      'analytics',
      'marketing',
    ]);
  });

  it('getDecision returns native result', async () => {
    const decision = { decisionType: 'explicit', purposes: ['analytics'] };
    mockNative.consentGetDecision.mockResolvedValue(decision);

    const result = await Tealium.consent.getDecision();

    expect(result).toEqual(decision);
  });

  it('reset calls native consentReset', () => {
    Tealium.consent.reset();

    expect(mockNative.consentReset).toHaveBeenCalled();
  });
});
