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
    setDataLayer: jest.fn(),
    getDataLayerValue: jest.fn(),
    removeDataLayerValue: jest.fn(),
    removeDataLayerValues: jest.fn(),
    clearDataLayer: jest.fn(),
    getAllData: jest.fn(),
    enableDataLayerEvents: jest.fn(),
    disableDataLayerEvents: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    joinTrace: jest.fn(),
    leaveTrace: jest.fn(),
    forceEndOfVisit: jest.fn(),
    handleDeepLink: jest.fn(),
    setConsentDecision: jest.fn(),
    getConsentDecision: jest.fn(),
    resetConsentDecision: jest.fn(),
    dataLayerTransactionalUpdate: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  })),
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

    expect(mockNative.setDataLayer).toHaveBeenCalledWith(
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
  it('forwards the whole record and expiry to setDataLayer', () => {
    Tealium.dataLayer.put({ user_type: 'premium', count: 42 }, 'session');

    expect(mockNative.setDataLayer).toHaveBeenCalledTimes(1);
    expect(mockNative.setDataLayer).toHaveBeenCalledWith(
      { user_type: 'premium', count: 42 },
      'session'
    );
  });

  it("defaults expiry to 'forever' when omitted", () => {
    Tealium.dataLayer.put({ flag: true });

    expect(mockNative.setDataLayer).toHaveBeenCalledWith(
      { flag: true },
      'forever'
    );
  });

  it('forwards mixed-type arrays intact', () => {
    Tealium.dataLayer.put({ mixed: [1, 'two', true] } as any);

    expect(mockNative.setDataLayer).toHaveBeenCalledWith(
      { mixed: [1, 'two', true] },
      'forever'
    );
  });

  it('forwards null values without warning (null is a valid JSON value)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    Tealium.dataLayer.put({ nullable: null, ok: 'x' });

    expect(warn).not.toHaveBeenCalled();
    expect(mockNative.setDataLayer).toHaveBeenCalledWith(
      { nullable: null, ok: 'x' },
      'forever'
    );
    warn.mockRestore();
  });
});

// ── DataLayerAPI.remove ───────────────────────────────────────────────────────

describe('DataLayerAPI.remove', () => {
  it('calls removeDataLayerValue for single key', () => {
    Tealium.dataLayer.remove('user_id');

    expect(mockNative.removeDataLayerValue).toHaveBeenCalledWith('user_id');
  });

  it('calls removeDataLayerValues for array of keys', () => {
    Tealium.dataLayer.remove(['user_id', 'user_type']);

    expect(mockNative.removeDataLayerValues).toHaveBeenCalledWith([
      'user_id',
      'user_type',
    ]);
  });
});

// ── DataLayerAPI events ───────────────────────────────────────────────────────

describe('DataLayerAPI event subscriptions', () => {
  it('enables native events when first listener is added', () => {
    Tealium.dataLayer.onUpdated(() => {});

    expect(mockNative.enableDataLayerEvents).toHaveBeenCalledTimes(1);
  });

  it('does not re-enable events for second listener', () => {
    Tealium.dataLayer.onUpdated(() => {});
    Tealium.dataLayer.onUpdated(() => {});

    expect(mockNative.enableDataLayerEvents).toHaveBeenCalledTimes(1);
  });

  it('disables native events when last listener is removed', () => {
    const sub = Tealium.dataLayer.onUpdated(() => {});
    sub.remove();

    expect(mockNative.disableDataLayerEvents).toHaveBeenCalledTimes(1);
  });

  it('does not disable events while other listeners remain', () => {
    const sub1 = Tealium.dataLayer.onUpdated(() => {});
    Tealium.dataLayer.onUpdated(() => {});
    sub1.remove();

    expect(mockNative.disableDataLayerEvents).not.toHaveBeenCalled();
  });

  it('remove() is idempotent', () => {
    const sub = Tealium.dataLayer.onUpdated(() => {});
    sub.remove();
    sub.remove();

    expect(mockNative.disableDataLayerEvents).toHaveBeenCalledTimes(1);
  });

  it('mixes onUpdated and onRemoved listeners for ref-count', () => {
    const sub1 = Tealium.dataLayer.onUpdated(() => {});
    const sub2 = Tealium.dataLayer.onRemoved(() => {});

    sub1.remove();
    expect(mockNative.disableDataLayerEvents).not.toHaveBeenCalled();

    sub2.remove();
    expect(mockNative.disableDataLayerEvents).toHaveBeenCalledTimes(1);
  });
});

// ── DataLayerAPI.transactionally ──────────────────────────────────────────────

describe('DataLayerAPI.transactionally', () => {
  it('sends operations to native in a single batch', async () => {
    mockNative.dataLayerTransactionalUpdate.mockResolvedValue({});

    await Tealium.dataLayer.transactionally((ctx) => {
      ctx.put('key1', 'value1', 'session');
      ctx.remove('key2');
    });

    expect(mockNative.dataLayerTransactionalUpdate).toHaveBeenCalledTimes(1);
    expect(mockNative.dataLayerTransactionalUpdate).toHaveBeenCalledWith(
      [],
      expect.arrayContaining([
        expect.objectContaining({ type: 'put', key: 'key1', value: 'value1' }),
        expect.objectContaining({ type: 'remove', key: 'key2' }),
      ])
    );
  });

  it('pre-reads specified keys before the batch', async () => {
    mockNative.dataLayerTransactionalUpdate
      .mockResolvedValueOnce({ counter: 5 }) // pre-read
      .mockResolvedValueOnce({}); // write batch

    let capturedValue: unknown;
    await Tealium.dataLayer.transactionally(
      (ctx) => {
        capturedValue = ctx.get('counter');
        ctx.put('counter', (capturedValue as number) + 1, 'forever');
      },
      ['counter']
    );

    // First call is the pre-read
    expect(mockNative.dataLayerTransactionalUpdate).toHaveBeenNthCalledWith(
      1,
      ['counter'],
      []
    );
    expect(capturedValue).toBe(5);
    // Second call commits the incremented value
    expect(mockNative.dataLayerTransactionalUpdate).toHaveBeenNthCalledWith(
      2,
      [],
      expect.arrayContaining([
        expect.objectContaining({ key: 'counter', value: 6 }),
      ])
    );
  });

  it('skips the write call when block queues no operations', async () => {
    await Tealium.dataLayer.transactionally(() => {});

    expect(mockNative.dataLayerTransactionalUpdate).not.toHaveBeenCalled();
  });
});

// ── TraceAPI ──────────────────────────────────────────────────────────────────

describe('TraceAPI', () => {
  it('join calls native joinTrace', () => {
    Tealium.trace.join('abc123');

    expect(mockNative.joinTrace).toHaveBeenCalledWith('abc123');
  });

  it('leave calls native leaveTrace', () => {
    Tealium.trace.leave();

    expect(mockNative.leaveTrace).toHaveBeenCalled();
  });

  it('forceEndOfVisit calls native forceEndOfVisit', () => {
    Tealium.trace.forceEndOfVisit();

    expect(mockNative.forceEndOfVisit).toHaveBeenCalled();
  });
});

// ── DeepLinkAPI ───────────────────────────────────────────────────────────────

describe('DeepLinkAPI', () => {
  it('passes url and null referrer by default', async () => {
    mockNative.handleDeepLink.mockResolvedValue(true);

    const result = await Tealium.deepLink.handle('myapp://product/123');

    expect(mockNative.handleDeepLink).toHaveBeenCalledWith(
      'myapp://product/123',
      null
    );
    expect(result).toBe(true);
  });

  it('passes referrer when provided', async () => {
    mockNative.handleDeepLink.mockResolvedValue(true);

    await Tealium.deepLink.handle('myapp://x', 'https://referrer.com');

    expect(mockNative.handleDeepLink).toHaveBeenCalledWith(
      'myapp://x',
      'https://referrer.com'
    );
  });
});

// ── ConsentAPI ────────────────────────────────────────────────────────────────

describe('ConsentAPI', () => {
  it('setDecision calls native setConsentDecision', () => {
    Tealium.consent.setDecision('explicit', ['analytics', 'marketing']);

    expect(mockNative.setConsentDecision).toHaveBeenCalledWith('explicit', [
      'analytics',
      'marketing',
    ]);
  });

  it('getDecision returns native result', async () => {
    const decision = { decisionType: 'explicit', purposes: ['analytics'] };
    mockNative.getConsentDecision.mockResolvedValue(decision);

    const result = await Tealium.consent.getDecision();

    expect(result).toEqual(decision);
  });

  it('reset calls native resetConsentDecision', () => {
    Tealium.consent.reset();

    expect(mockNative.resetConsentDecision).toHaveBeenCalled();
  });
});
