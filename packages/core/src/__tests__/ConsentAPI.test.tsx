import Tealium from '../index';
import { ErrorCodes } from '../errors';
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
  resetTealiumState(true);
});

// ── ConsentAPI ────────────────────────────────────────────────────────────────

describe('ConsentAPI', () => {
  it('setDecision calls native consentSetDecision and resolves', async () => {
    await Tealium.consent.setDecision('explicit', ['analytics', 'marketing']);

    expect(mockNative.consentSetDecision).toHaveBeenCalledWith('explicit', [
      'analytics',
      'marketing',
    ]);
  });

  it('setDecision rejects with CONSENT_NOT_ENABLED code when native rejects', async () => {
    // Native rejects with a coded error (code + message) when no cmpAdapter is
    // configured; assert the code, not just the message, so the test name holds.
    mockNative.consentSetDecision.mockRejectedValue(
      Object.assign(new Error('Consent integration not enabled'), {
        code: ErrorCodes.CONSENT_NOT_ENABLED,
      })
    );

    await expect(
      Tealium.consent.setDecision('explicit', ['analytics'])
    ).rejects.toMatchObject({ code: ErrorCodes.CONSENT_NOT_ENABLED });
  });

  it('getDecision returns native result', async () => {
    const decision = { decisionType: 'explicit', purposes: ['analytics'] };
    mockNative.consentGetDecision.mockResolvedValue(decision);

    const result = await Tealium.consent.getDecision();

    expect(result).toEqual(decision);
  });

  it('reset calls native consentReset and resolves', async () => {
    await Tealium.consent.reset();

    expect(mockNative.consentReset).toHaveBeenCalled();
  });

  it('reset rejects with CONSENT_NOT_ENABLED code when native rejects', async () => {
    mockNative.consentReset.mockRejectedValue(
      Object.assign(new Error('Consent integration not enabled'), {
        code: ErrorCodes.CONSENT_NOT_ENABLED,
      })
    );

    await expect(Tealium.consent.reset()).rejects.toMatchObject({
      code: ErrorCodes.CONSENT_NOT_ENABLED,
    });
  });

  it('getAllPurposes forwards to consentGetAllPurposes', async () => {
    mockNative.consentGetAllPurposes.mockResolvedValue([
      'analytics',
      'marketing',
    ]);

    const result = await Tealium.consent.getAllPurposes();

    expect(mockNative.consentGetAllPurposes).toHaveBeenCalledTimes(1);
    expect(result).toEqual(['analytics', 'marketing']);
  });

  it('getAllPurposes returns null when native returns null', async () => {
    mockNative.consentGetAllPurposes.mockResolvedValue(null);

    const result = await Tealium.consent.getAllPurposes();

    expect(result).toBeNull();
  });
});

// ── ConsentAPI.onDecisionChanged ──────────────────────────────────────────────

describe('ConsentAPI.onDecisionChanged', () => {
  it('subscribes to native when first listener added', () => {
    Tealium.consent.onDecisionChanged(() => {});

    expect(mockNative.consentOnDecisionChangedSubscribe).toHaveBeenCalledTimes(
      1
    );
  });

  it('does not re-subscribe for a second listener', () => {
    Tealium.consent.onDecisionChanged(() => {});
    Tealium.consent.onDecisionChanged(() => {});

    expect(mockNative.consentOnDecisionChangedSubscribe).toHaveBeenCalledTimes(
      1
    );
  });

  it('disposes native subscription when last listener is disposed', () => {
    const sub = Tealium.consent.onDecisionChanged(() => {});
    sub.dispose();

    expect(mockNative.consentOnDecisionChangedDispose).toHaveBeenCalledTimes(1);
  });

  it('does not dispose while other listeners remain', () => {
    const sub1 = Tealium.consent.onDecisionChanged(() => {});
    Tealium.consent.onDecisionChanged(() => {});
    sub1.dispose();

    expect(mockNative.consentOnDecisionChangedDispose).not.toHaveBeenCalled();
  });

  it('dispose is idempotent', () => {
    const sub = Tealium.consent.onDecisionChanged(() => {});
    expect(sub.isDisposed).toBe(false);

    sub.dispose();
    expect(sub.isDisposed).toBe(true);

    sub.dispose();
    expect(mockNative.consentOnDecisionChangedDispose).toHaveBeenCalledTimes(1);
  });

  it('shutdown disposes native consent subscription', async () => {
    mockNative.initialize.mockResolvedValue(true);
    await Tealium.create(BASE_CONFIG);

    Tealium.consent.onDecisionChanged(() => {});
    await Tealium.shutdown();

    expect(mockNative.consentOnDecisionChangedDispose).toHaveBeenCalled();
  });
});
