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
  resetTealiumState(true);
});

describe('TraceAPI', () => {
  it('join calls native traceJoin and returns Promise', async () => {
    await Tealium.trace.join('abc123');

    expect(mockNative.traceJoin).toHaveBeenCalledWith('abc123');
  });

  it('join rejects when native rejects (TRACE_ERROR)', async () => {
    mockNative.traceJoin.mockRejectedValue(new Error('Failed to join trace'));

    await expect(Tealium.trace.join('abc123')).rejects.toThrow(
      'Failed to join trace'
    );
  });

  it('leave calls native traceLeave and returns Promise', async () => {
    await Tealium.trace.leave();

    expect(mockNative.traceLeave).toHaveBeenCalled();
  });

  it('leave rejects when native rejects (TRACE_ERROR)', async () => {
    mockNative.traceLeave.mockRejectedValue(new Error('Failed to leave trace'));

    await expect(Tealium.trace.leave()).rejects.toThrow(
      'Failed to leave trace'
    );
  });

  it('forceEndOfVisit calls native and returns TrackResult', async () => {
    mockNative.traceForceEndOfVisit.mockResolvedValue({
      status: 'accepted',
      info: 'ok',
      dispatch: {
        id: 'uuid-3',
        timestamp: 3000,
        payload: { event: 'end_of_visit' },
      },
    });

    const result = await Tealium.trace.forceEndOfVisit();

    expect(mockNative.traceForceEndOfVisit).toHaveBeenCalled();
    expect(result.status).toBe('accepted');
    expect(result.info).toBe('ok');
    expect(result.dispatch).toEqual({
      id: 'uuid-3',
      timestamp: 3000,
      payload: { event: 'end_of_visit' },
    });
  });

  it('forceEndOfVisit maps unknown status to dropped', async () => {
    mockNative.traceForceEndOfVisit.mockResolvedValue({
      status: 'something_else',
      info: 'x',
      dispatch: { id: 'uuid-1', timestamp: 1000, payload: {} },
    });

    const result = await Tealium.trace.forceEndOfVisit();

    expect(result.status).toBe('dropped');
  });

  it('forceEndOfVisit rejects when native rejects (TRACE_ERROR)', async () => {
    mockNative.traceForceEndOfVisit.mockRejectedValue(
      new Error('Failed to force end of visit')
    );

    await expect(Tealium.trace.forceEndOfVisit()).rejects.toThrow(
      'Failed to force end of visit'
    );
  });
});
