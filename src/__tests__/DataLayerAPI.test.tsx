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

// ── DataLayerAPI.put ──────────────────────────────────────────────────────────

describe('DataLayerAPI.put', () => {
  it('forwards the whole record and expiry to dataLayerPut and resolves', async () => {
    await Tealium.dataLayer.put({ user_type: 'premium', count: 42 }, 'session');

    expect(mockNative.dataLayerPut).toHaveBeenCalledTimes(1);
    expect(mockNative.dataLayerPut).toHaveBeenCalledWith(
      { user_type: 'premium', count: 42 },
      'session'
    );
  });

  it("defaults expiry to 'forever' when omitted", async () => {
    await Tealium.dataLayer.put({ flag: true });

    expect(mockNative.dataLayerPut).toHaveBeenCalledWith(
      { flag: true },
      'forever'
    );
  });

  it('forwards mixed-type arrays intact', async () => {
    await Tealium.dataLayer.put({ mixed: [1, 'two', true] } as any);

    expect(mockNative.dataLayerPut).toHaveBeenCalledWith(
      { mixed: [1, 'two', true] },
      'forever'
    );
  });

  it('forwards null values without warning (null is a valid JSON value)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await Tealium.dataLayer.put({ nullable: null, ok: 'x' });

    expect(warn).not.toHaveBeenCalled();
    expect(mockNative.dataLayerPut).toHaveBeenCalledWith(
      { nullable: null, ok: 'x' },
      'forever'
    );
    warn.mockRestore();
  });

  it('serializes { after: Date } expiry to epoch wire string', async () => {
    const date = new Date(1893456000 * 1000);
    await Tealium.dataLayer.put({ tok: 'abc' }, { after: date });

    expect(mockNative.dataLayerPut).toHaveBeenCalledWith(
      { tok: 'abc' },
      'afterEpochSeconds:1893456000'
    );
  });

  it('propagates native rejection to caller', async () => {
    mockNative.dataLayerPut.mockRejectedValue(new Error('boom'));

    await expect(Tealium.dataLayer.put({ k: 'v' })).rejects.toThrow('boom');
  });
});

// ── DataLayerAPI.remove ───────────────────────────────────────────────────────

describe('DataLayerAPI.remove', () => {
  it('calls dataLayerRemove for single key and resolves', async () => {
    await Tealium.dataLayer.remove('user_id');

    expect(mockNative.dataLayerRemove).toHaveBeenCalledWith('user_id');
  });

  it('calls dataLayerRemoveKeys for array of keys and resolves', async () => {
    await Tealium.dataLayer.remove(['user_id', 'user_type']);

    expect(mockNative.dataLayerRemoveKeys).toHaveBeenCalledWith([
      'user_id',
      'user_type',
    ]);
  });

  it('propagates native rejection on single-key remove', async () => {
    mockNative.dataLayerRemove.mockRejectedValue(new Error('rm fail'));

    await expect(Tealium.dataLayer.remove('user_id')).rejects.toThrow(
      'rm fail'
    );
  });

  it('propagates native rejection on multi-key remove', async () => {
    mockNative.dataLayerRemoveKeys.mockRejectedValue(new Error('rm fail'));

    await expect(Tealium.dataLayer.remove(['a', 'b'])).rejects.toThrow(
      'rm fail'
    );
  });
});

// ── DataLayerAPI.clear ────────────────────────────────────────────────────────

describe('DataLayerAPI.clear', () => {
  it('forwards to dataLayerClear and resolves', async () => {
    mockNative.dataLayerClear.mockResolvedValue(undefined);

    await Tealium.dataLayer.clear();

    expect(mockNative.dataLayerClear).toHaveBeenCalledTimes(1);
  });

  it('propagates native rejection', async () => {
    mockNative.dataLayerClear.mockRejectedValue(new Error('clear fail'));

    await expect(Tealium.dataLayer.clear()).rejects.toThrow('clear fail');
  });
});

// ── DataLayerAPI.getAll ───────────────────────────────────────────────────────

describe('DataLayerAPI.getAll', () => {
  it('forwards to dataLayerGetAll and returns the record', async () => {
    const all = { user_id: '123', flag: true };
    mockNative.dataLayerGetAll.mockResolvedValue(all);

    const result = await Tealium.dataLayer.getAll();

    expect(mockNative.dataLayerGetAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(all);
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

// ── DataLayerAPI typed scalar getters ─────────────────────────────────────────

describe('DataLayerAPI typed scalar getters', () => {
  it('getString returns string value', async () => {
    mockNative.dataLayerGetDataItem.mockResolvedValue({
      type: 'string',
      value: 'hello',
    });

    expect(await Tealium.dataLayer.getString('k')).toBe('hello');
  });

  it('getString returns null for non-string item', async () => {
    mockNative.dataLayerGetDataItem.mockResolvedValue({
      type: 'number',
      value: 42,
    });

    expect(await Tealium.dataLayer.getString('k')).toBeNull();
  });

  it('getString returns null when key not found', async () => {
    mockNative.dataLayerGetDataItem.mockResolvedValue(null);

    expect(await Tealium.dataLayer.getString('k')).toBeNull();
  });

  it('getInt returns truncated integer', async () => {
    mockNative.dataLayerGetDataItem.mockResolvedValue({
      type: 'number',
      value: 3.9,
    });

    expect(await Tealium.dataLayer.getInt('k')).toBe(3);
  });

  it('getInt returns null for non-number item', async () => {
    mockNative.dataLayerGetDataItem.mockResolvedValue({
      type: 'string',
      value: '5',
    });

    expect(await Tealium.dataLayer.getInt('k')).toBeNull();
  });

  it('getDouble returns number value as-is', async () => {
    mockNative.dataLayerGetDataItem.mockResolvedValue({
      type: 'number',
      value: 3.14,
    });

    expect(await Tealium.dataLayer.getDouble('k')).toBe(3.14);
  });

  it('getBoolean returns boolean value', async () => {
    mockNative.dataLayerGetDataItem.mockResolvedValue({
      type: 'boolean',
      value: true,
    });

    expect(await Tealium.dataLayer.getBoolean('k')).toBe(true);
  });

  it('getBoolean returns null for non-boolean item', async () => {
    mockNative.dataLayerGetDataItem.mockResolvedValue({
      type: 'number',
      value: 1,
    });

    expect(await Tealium.dataLayer.getBoolean('k')).toBeNull();
  });
});

// ── DataLayerAPI event subscriptions ──────────────────────────────────────────

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
