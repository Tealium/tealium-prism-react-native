/**
 * DataLayerAPI - Interface for managing persistent data layer
 *
 * Mirrors the native DataLayer API from Swift/Kotlin SDKs.
 * Data added here will be included with every tracking call.
 */

import { NativeEventEmitter } from 'react-native';
import NativeTealiumPrism from '../NativeTealiumPrismReactNative';
import type {
  DataItem,
  DataList,
  Expiry,
  TransactionContext,
  DataLayerOperation,
} from '../types';
import { TealiumEvents } from '../types';

/**
 * Callback for data layer update events.
 */
export type DataLayerUpdateCallback = (data: Record<string, unknown>) => void;

/**
 * Callback for data layer remove events.
 */
export type DataLayerRemoveCallback = (keys: string[]) => void;

/**
 * DataLayerAPI provides methods for managing the persistent data layer.
 *
 * Data added to the data layer will be automatically included with every
 * tracking call sent through Tealium.
 *
 * @example
 * ```typescript
 * // Add data
 * Tealium.dataLayer.put({ user_type: 'premium' }, 'session');
 *
 * // Get data
 * const value = await Tealium.dataLayer.get('user_type');
 *
 * // Remove data
 * Tealium.dataLayer.remove('user_type');
 *
 * // Subscribe to updates
 * const subscription = Tealium.dataLayer.onUpdated((data) => {
 *   console.log('Data updated:', data);
 * });
 * ```
 */
export class DataLayerAPI {
  private eventEmitter: NativeEventEmitter;
  private listenerCount = 0;

  constructor(eventEmitter: NativeEventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * Add data to the persistent data layer.
   *
   * Supports multiple value types: string, number, boolean, string[], and objects.
   * Arrays of numbers or booleans are not supported here — use transactionally() instead.
   * Unsupported types are skipped with a console warning.
   *
   * @param data - Object containing key-value pairs to add
   * @param expiry - When the data should expire: 'session', 'forever', or 'untilRestart'
   * @default 'forever'
   *
   * @example
   * ```typescript
   * Tealium.dataLayer.put({
   *   user_type: 'premium',
   *   user_id: '12345',
   *   preferences: { dark_mode: true }
   * });
   * ```
   */
  put(data: Record<string, unknown>, expiry: Expiry = 'forever'): void {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        NativeTealiumPrism.setDataLayerString(key, value, expiry);
      } else if (typeof value === 'number') {
        NativeTealiumPrism.setDataLayerNumber(key, value, expiry);
      } else if (typeof value === 'boolean') {
        NativeTealiumPrism.setDataLayerBoolean(key, value, expiry);
      } else if (Array.isArray(value)) {
        if (value.every((v) => typeof v === 'string')) {
          NativeTealiumPrism.setDataLayerStringArray(
            key,
            value as string[],
            expiry
          );
        } else {
          // Only string[] has a dedicated native method. Passing a non-string
          // array to setDataLayerObject would silently corrupt data on native.
          console.warn(
            `[Tealium] Unsupported array type for key "${key}": only string[] is supported. ` +
              'Use transactionally() to store number or boolean arrays.'
          );
        }
      } else if (typeof value === 'object' && value !== null) {
        NativeTealiumPrism.setDataLayerObject(
          key,
          value as Record<string, unknown>,
          expiry
        );
      } else {
        console.warn(
          `[Tealium] Unsupported data type for key "${key}": ${value === null ? 'null' : typeof value}. ` +
            'Supported types: string, number, boolean, string[], object.'
        );
      }
    }
  }

  /**
   * Get a value from the data layer.
   *
   * @param key - Key to retrieve
   * @returns Promise resolving to the value or null if not found
   *
   * @example
   * ```typescript
   * const userId = await Tealium.dataLayer.get('user_id');
   * ```
   */
  async get(key: string): Promise<DataItem | null> {
    return (await NativeTealiumPrism.getDataLayerValue(key)) as DataItem | null;
  }

  /**
   * Get a list value from the data layer.
   *
   * @param key - Key to retrieve
   * @returns Promise resolving to the DataList or null if the value is not a list
   */
  async getList(key: string): Promise<DataList | null> {
    const item = await this.get(key);
    if (!item || item.type !== 'list') return null;
    return item.value;
  }

  /**
   * Get all data from the data layer.
   *
   * @returns Promise resolving with all data layer values
   *
   * @example
   * ```typescript
   * const allData = await Tealium.dataLayer.getAll();
   * ```
   */
  getAll(): Promise<Record<string, unknown>> {
    return NativeTealiumPrism.getAllData() as Promise<Record<string, unknown>>;
  }

  /**
   * Remove one or more keys from the data layer.
   *
   * @param keys - Key or array of keys to remove
   *
   * @example
   * ```typescript
   * // Remove single key
   * Tealium.dataLayer.remove('user_id');
   *
   * // Remove multiple keys
   * Tealium.dataLayer.remove(['user_id', 'user_type']);
   * ```
   */
  remove(keys: string | string[]): void {
    if (Array.isArray(keys)) {
      NativeTealiumPrism.removeDataLayerValues(keys);
    } else {
      NativeTealiumPrism.removeDataLayerValue(keys);
    }
  }

  /**
   * Clear all data from the data layer.
   *
   * @returns Promise resolving when clear is complete
   */
  clear(): Promise<void> {
    return NativeTealiumPrism.clearDataLayer();
  }

  /**
   * Subscribe to data layer update events.
   * Called whenever data is added or modified.
   *
   * @param callback - Function called with the updated data
   * @returns Subscription object - call remove() to unsubscribe
   *
   * @example
   * ```typescript
   * const subscription = Tealium.dataLayer.onUpdated((data) => {
   *   console.log('Data updated:', data);
   * });
   *
   * // Later, to unsubscribe:
   * subscription.remove();
   * ```
   */
  onUpdated(callback: DataLayerUpdateCallback): { remove: () => void } {
    if (this.listenerCount === 0) {
      NativeTealiumPrism.enableDataLayerEvents();
    }
    this.listenerCount++;

    const subscription = this.eventEmitter.addListener(
      TealiumEvents.DATA_LAYER_UPDATED,
      callback as (data: unknown) => void
    );

    let isRemoved = false;
    return {
      remove: () => {
        if (isRemoved) return;
        isRemoved = true;
        subscription.remove();
        this.listenerCount--;
        if (this.listenerCount === 0) {
          NativeTealiumPrism.disableDataLayerEvents();
        }
      },
    };
  }

  /**
   * Subscribe to data layer remove events.
   * Called whenever data is removed from the data layer.
   *
   * @param callback - Function called with array of removed keys
   * @returns Subscription object - call remove() to unsubscribe
   */
  onRemoved(callback: DataLayerRemoveCallback): { remove: () => void } {
    if (this.listenerCount === 0) {
      NativeTealiumPrism.enableDataLayerEvents();
    }
    this.listenerCount++;

    const subscription = this.eventEmitter.addListener(
      TealiumEvents.DATA_LAYER_REMOVED,
      (event: any) => callback(event.keys as string[])
    );

    let isRemoved = false;
    return {
      remove: () => {
        if (isRemoved) return;
        isRemoved = true;
        subscription.remove();
        this.listenerCount--;
        if (this.listenerCount === 0) {
          NativeTealiumPrism.disableDataLayerEvents();
        }
      },
    };
  }

  /**
   * Execute multiple data layer operations as a batch.
   *
   * The callback receives a TransactionContext that allows:
   * - get(key): Read a pre-fetched value (see `keysToRead`)
   * - put(key, value, expiry): Queue a put operation
   * - remove(key): Queue a remove operation
   *
   * All queued write operations are committed in a single native batch — no
   * other writer can interleave between individual puts/removes within that
   * batch. Pre-reads, however, are fetched in a separate native call before
   * the batch is committed. Values returned by `ctx.get()` reflect the data
   * layer state at the time of the pre-read, not at commit time.
   *
   * @param block - Function that receives a TransactionContext to build the transaction
   * @param keysToRead - Array of keys to pre-read before executing the transaction
   * @returns Promise resolving when the transaction is complete
   *
   * @example
   * ```typescript
   * await Tealium.dataLayer.transactionally(
   *   (ctx) => {
   *     ctx.put('key', 'value', 'forever');
   *     ctx.remove('key3');
   *     const count = (ctx.get('key4') as number) ?? 0;
   *     ctx.put('key4', count + 1, 'forever');
   *   },
   *   ['key4'] // keys to pre-read
   * );
   * ```
   */
  async transactionally(
    block: (context: TransactionContext) => void,
    keysToRead: string[] = []
  ): Promise<void> {
    const operations: DataLayerOperation[] = [];
    let preReadValues: Record<string, unknown> = {};

    if (keysToRead.length > 0) {
      const result = await NativeTealiumPrism.dataLayerTransactionalUpdate(
        keysToRead,
        []
      );
      preReadValues = (result as Record<string, unknown>) ?? {};
    }

    const context: TransactionContext = {
      get: (key: string): unknown => {
        return preReadValues[key];
      },
      put: (key: string, value: unknown, expiry: Expiry = 'forever'): void => {
        operations.push({ type: 'put', key, value, expiry });
      },
      remove: (key: string): void => {
        operations.push({ type: 'remove', key });
      },
    };

    block(context);

    if (operations.length > 0) {
      await NativeTealiumPrism.dataLayerTransactionalUpdate(
        [],
        operations as unknown as Record<string, unknown>[]
      );
    }
  }
}
