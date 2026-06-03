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

  it('rejects when native rejects (NOT_INITIALIZED)', async () => {
    mockNative.deepLinkHandle.mockRejectedValue(
      new Error('Tealium is not initialized')
    );

    await expect(
      Tealium.deepLink.handle('myapp://product/123')
    ).rejects.toThrow('Tealium is not initialized');
  });
});
