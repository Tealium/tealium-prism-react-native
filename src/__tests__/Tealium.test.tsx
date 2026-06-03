import Tealium from '../index';
import {
  BASE_CONFIG,
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

// ── Tealium.create ────────────────────────────────────────────────────────────

describe('Tealium.create', () => {
  it('calls native initialize and resolves on success', async () => {
    mockNative.initialize.mockResolvedValue(true);

    await Tealium.create(BASE_CONFIG);

    expect(mockNative.initialize).toHaveBeenCalledTimes(1);
    expect(mockNative.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        account: 'acct',
        profile: 'profile',
        environment: 'dev',
      })
    );
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
      -1
    );
  });

  it('rejects and leaves isReady=false when native init fails', async () => {
    mockNative.initialize.mockRejectedValue(new Error('init failed'));

    await expect(Tealium.create(BASE_CONFIG)).rejects.toThrow('init failed');
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

  it('passes the cmpAdapter id through verbatim (no default applied)', async () => {
    mockNative.initialize.mockResolvedValue(true);

    await Tealium.create({
      ...BASE_CONFIG,
      cmpAdapter: { id: 'my-cmp', allPurposes: ['analytics'] },
    });

    expect(mockNative.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        cmpAdapter: expect.objectContaining({ id: 'my-cmp' }),
      })
    );
  });

  it('does not propagate plugin metadata put failures to caller', async () => {
    mockNative.initialize.mockResolvedValue(true);
    mockNative.dataLayerPut.mockRejectedValue(new Error('metadata fail'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(Tealium.create(BASE_CONFIG)).resolves.toBeUndefined();

    // Wait one microtask tick so the inner .catch can settle and log.
    await Promise.resolve();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('plugin metadata put failed'),
      expect.any(Error)
    );
    warn.mockRestore();
  });
});

// ── Tealium.create — consentConfiguration passthrough ─────────────────────────

describe('Tealium.create consentConfiguration', () => {
  it('passes consentConfiguration to native when cmpAdapter present', async () => {
    mockNative.initialize.mockResolvedValue(true);

    await Tealium.create({
      ...BASE_CONFIG,
      cmpAdapter: { id: 'my-cmp', allPurposes: ['analytics', 'marketing'] },
      consentConfiguration: {
        tealiumPurposeId: 'analytics',
        purposes: [{ purposeId: 'marketing', dispatcherIds: ['collect'] }],
        refireDispatcherIds: ['collect'],
      },
    });

    expect(mockNative.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        consentConfiguration: {
          tealiumPurposeId: 'analytics',
          purposes: [{ purposeId: 'marketing', dispatcherIds: ['collect'] }],
          refireDispatcherIds: ['collect'],
        },
      })
    );
  });

  it('omits consentConfiguration from spec when cmpAdapter absent', async () => {
    mockNative.initialize.mockResolvedValue(true);

    await Tealium.create({
      ...BASE_CONFIG,
      consentConfiguration: {
        tealiumPurposeId: 'analytics',
      },
    });

    const spec = mockNative.initialize.mock.calls[0]?.[0] as any;
    expect(spec.consentConfiguration).toBeUndefined();
  });
});

// ── Sub-API getter guard (pre-create access) ─────────────────────────────────

describe('sub-API getter guard', () => {
  it.each(['dataLayer', 'trace', 'deepLink', 'consent'] as const)(
    'throws when %s is accessed before create()',
    (api) => {
      expect(() => (Tealium as any)[api]).toThrow(
        new RegExp(`${api} accessed before create\\(\\)`)
      );
    }
  );

  it('returns the sub-API once create() has resolved', async () => {
    mockNative.initialize.mockResolvedValue(true);
    await Tealium.create(BASE_CONFIG);

    expect(() => Tealium.dataLayer).not.toThrow();
    expect(() => Tealium.trace).not.toThrow();
    expect(() => Tealium.deepLink).not.toThrow();
    expect(() => Tealium.consent).not.toThrow();
  });

  it('throws again after shutdown()', async () => {
    mockNative.initialize.mockResolvedValue(true);
    await Tealium.create(BASE_CONFIG);
    await Tealium.shutdown();

    expect(() => Tealium.dataLayer).toThrow(/before create\(\)/);
  });
});

// ── Tealium.shutdown ──────────────────────────────────────────────────────────

describe('Tealium.shutdown', () => {
  it('calls native shutdown and resets isReady', async () => {
    mockNative.initialize.mockResolvedValue(true);
    await Tealium.create(BASE_CONFIG);

    await Tealium.shutdown();

    expect(mockNative.shutdown).toHaveBeenCalledTimes(1);
    expect(Tealium.isReady).toBe(false);
  });

  it('nullifies sub-API instances after shutdown', async () => {
    mockNative.initialize.mockResolvedValue(true);
    await Tealium.create(BASE_CONFIG);

    await Tealium.shutdown();

    // Internal instances are cleared, and the guard is re-armed so the getter
    // throws again until the next create().
    expect((Tealium as any)._dataLayer).toBeNull();
    expect(() => Tealium.dataLayer).toThrow(/before create\(\)/);
  });

  it('disposes JS sub-API streams before awaiting native shutdown', async () => {
    mockNative.initialize.mockResolvedValue(true);
    await Tealium.create(BASE_CONFIG);

    Tealium.dataLayer.onDataUpdated(() => {});
    Tealium.consent.onDecisionChanged(() => {});

    // Defer native shutdown resolution so we can assert ordering.
    let resolveShutdown!: () => void;
    mockNative.shutdown.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveShutdown = resolve;
      })
    );

    const shutdownPromise = Tealium.shutdown();

    // Stream disposers fire synchronously before native await.
    expect(mockNative.dataLayerOnDataUpdatedDispose).toHaveBeenCalled();
    expect(mockNative.consentOnDecisionChangedDispose).toHaveBeenCalled();

    resolveShutdown();
    await shutdownPromise;

    expect(Tealium.isReady).toBe(false);
  });

  it('keeps sub-API non-null until native shutdown resolves', async () => {
    mockNative.initialize.mockResolvedValue(true);
    await Tealium.create(BASE_CONFIG);

    let resolveShutdown!: () => void;
    mockNative.shutdown.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveShutdown = resolve;
      })
    );

    const shutdownPromise = Tealium.shutdown();

    // Pre-resolution snapshot — sub-API must still be reachable.
    expect((Tealium as any)._dataLayer).not.toBeNull();

    resolveShutdown();
    await shutdownPromise;

    // Post-resolution snapshot — instances cleared.
    expect((Tealium as any)._dataLayer).toBeNull();
    expect((Tealium as any)._trace).toBeNull();
    expect((Tealium as any)._deepLink).toBeNull();
    expect((Tealium as any)._consent).toBeNull();
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

  it('syncs isReady to false when native reports not initialized', async () => {
    // Prime local state to true so the false sync is observable.
    mockNative.initialize.mockResolvedValue(true);
    await Tealium.create(BASE_CONFIG);
    expect(Tealium.isReady).toBe(true);

    mockNative.isInitialized.mockResolvedValue(false);

    const result = await Tealium.isInitialized();

    expect(result).toBe(false);
    expect(Tealium.isReady).toBe(false);
  });

  it('propagates native rejection and leaves isReady unchanged', async () => {
    mockNative.initialize.mockResolvedValue(true);
    await Tealium.create(BASE_CONFIG);

    mockNative.isInitialized.mockRejectedValue(new Error('probe fail'));

    await expect(Tealium.isInitialized()).rejects.toThrow('probe fail');
    // Rejection happens before assignment, so cached state is untouched.
    expect(Tealium.isReady).toBe(true);
  });
});

// ── Tealium.track ─────────────────────────────────────────────────────────────

describe('Tealium.track', () => {
  it('calls native track with correct shape', async () => {
    mockNative.track.mockResolvedValue({
      status: 'accepted',
      info: '',
      dispatch: { id: 'uuid-1', timestamp: 1000, payload: {} },
    });

    await Tealium.track('button_click', 'event', { button_id: 'submit' });

    expect(mockNative.track).toHaveBeenCalledWith({
      name: 'button_click',
      type: 'event',
      data: { button_id: 'submit' },
    });
  });

  it('defaults type to event', async () => {
    mockNative.track.mockResolvedValue({
      status: 'accepted',
      info: '',
      dispatch: { id: 'uuid-1', timestamp: 1000, payload: {} },
    });

    await Tealium.track('page_view');

    expect(mockNative.track).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'event' })
    );
  });

  it('returns mapped TrackResult', async () => {
    mockNative.track.mockResolvedValue({
      status: 'dropped',
      info: 'consent blocked',
      dispatch: { id: 'uuid-2', timestamp: 2000, payload: { k: 'v' } },
    });

    const result = await Tealium.track('test_event');

    expect(result.status).toBe('dropped');
    expect(result.info).toBe('consent blocked');
    expect(result.dispatch).toEqual({
      id: 'uuid-2',
      timestamp: 2000,
      payload: { k: 'v' },
    });
  });

  it('maps unknown status to dropped', async () => {
    mockNative.track.mockResolvedValue({
      status: 'unknown',
      info: 'x',
      dispatch: { id: 'uuid-1', timestamp: 1000, payload: {} },
    });

    const result = await Tealium.track('test_event');

    expect(result.status).toBe('dropped');
  });

  it('propagates native rejection (no internal swallow)', async () => {
    mockNative.track.mockRejectedValue(new Error('track fail'));

    await expect(Tealium.track('test_event')).rejects.toThrow('track fail');
  });
});
