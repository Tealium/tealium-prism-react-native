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

describe('TraceAPI', () => {
  it('join calls native traceJoin and returns Promise', async () => {
    await Tealium.trace.join('abc123');

    expect(mockNative.traceJoin).toHaveBeenCalledWith('abc123');
  });

  it('leave calls native traceLeave and returns Promise', async () => {
    await Tealium.trace.leave();

    expect(mockNative.traceLeave).toHaveBeenCalled();
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
});
