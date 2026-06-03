import Tealium from '../../index';

/**
 * Typed reference to the mocked TurboModule. Each test file that wants this
 * imports `getMockNative()` after its own `jest.mock(...)` call has been
 * registered (call inside `beforeEach` or per-test).
 */
export function getMockNative(): jest.Mocked<
  typeof import('../../NativeTealiumPrismReactNative').default
> {
  return jest.requireMock('../../NativeTealiumPrismReactNative').default;
}

export const BASE_CONFIG = {
  account: 'acct',
  profile: 'profile',
  environment: 'dev' as const,
};

/**
 * Reset Tealium private static state and clear the module-level
 * NativeEventEmitter listener counts between tests.
 *
 * @param initialized - Final value for the private `_initialized` flag. Pass
 *   `true` in sub-API suites that exercise getters directly (the getters now
 *   throw before `create()`); leave it `false` (default) for lifecycle tests
 *   that drive `create()`/`shutdown()` themselves.
 */
export function resetTealiumState(initialized = false): void {
  (Tealium as any)._dataLayer = null;
  (Tealium as any)._trace = null;
  (Tealium as any)._deepLink = null;
  (Tealium as any)._consent = null;

  // The module-level NativeEventEmitter instance is shared across tests; clear
  // its per-event listener counts so each test starts at 0. The getter is
  // guarded, so flip the flag on just long enough to reach the emitter.
  (Tealium as any)._initialized = true;
  const fresh = Tealium.dataLayer as any;
  fresh.eventEmitter.removeAllListeners('TealiumDataLayerUpdated');
  fresh.eventEmitter.removeAllListeners('TealiumDataLayerRemoved');
  fresh.eventEmitter.removeAllListeners('TealiumConsentDecisionChanged');

  (Tealium as any)._dataLayer = null;
  (Tealium as any)._initialized = initialized;
}

/**
 * Re-establish default resolved values for void Promise<void> methods after
 * `jest.clearAllMocks()` (which also clears mockResolvedValue).
 */
export function restoreDefaultResolves(
  mockNative: ReturnType<typeof getMockNative>
): void {
  mockNative.shutdown.mockResolvedValue(undefined);
  mockNative.dataLayerPut.mockResolvedValue(undefined);
  mockNative.dataLayerRemove.mockResolvedValue(undefined);
  mockNative.dataLayerRemoveKeys.mockResolvedValue(undefined);
  mockNative.consentSetDecision.mockResolvedValue(undefined);
  mockNative.consentReset.mockResolvedValue(undefined);
  mockNative.traceJoin.mockResolvedValue(undefined);
  mockNative.traceLeave.mockResolvedValue(undefined);
}
