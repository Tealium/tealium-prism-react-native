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
  DataLayerValue,
  DataList,
  DataObject,
  Disposable,
  Expiry,
} from '../types';
import { TealiumEvents } from '../types';

/**
 * Callback for data layer update events.
 */
export type DataLayerUpdateCallback = (data: Record<string, unknown>) => void;

// Serializes the public Expiry union to the wire string the native bridge
// expects. Named variants pass through; { after: Date } encodes as
// "afterEpochSeconds:<n>" and is parsed by native ExpiryExtensions.
function serializeExpiry(expiry: Expiry): string {
  if (typeof expiry === 'string') return expiry;
  return `afterEpochSeconds:${Math.floor(expiry.after.getTime() / 1000)}`;
}

/**
 * Callback for data layer remove events.
 */
export type DataLayerRemoveCallback = (keys: string[]) => void;

// Native event payloads emitted via NativeEventEmitter. Shape must match
// what TealiumPrismBridge+DataLayer.swift / DataLayerDelegate.kt sendEvent.
type DataLayerUpdatedEvent = Record<string, unknown>;
interface DataLayerRemovedEvent {
  keys: string[];
}

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
 * const item = await Tealium.dataLayer.getDataItem('user_type');
 *
 * // Remove data
 * Tealium.dataLayer.remove('user_type');
 *
 * // Subscribe to updates
 * const sub = Tealium.dataLayer.onDataUpdated((data) => {
 *   console.log('Data updated:', data);
 * });
 * sub.dispose();
 * ```
 */
export class DataLayerAPI {
  private eventEmitter: NativeEventEmitter;

  constructor(eventEmitter: NativeEventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * Add data to the persistent data layer.
   *
   * Supports multiple value types: string, number, boolean, null, string[], number[], boolean[],
   * heterogeneous arrays (mixed types), and objects.
   *
   * @param data - Object containing key-value pairs to add
   * @param expiry - When the data should expire: 'session', 'forever', or 'untilRestart'
   * @default 'forever'
   * @returns Promise rejecting with `DATA_LAYER_ERROR` on native failure or
   *   `NOT_INITIALIZED` if Tealium is not yet initialized. Callers that don't
   *   need the result should attach `.catch(log)` to avoid unhandled rejections.
   *
   * @example
   * ```typescript
   * await Tealium.dataLayer.put({
   *   user_type: 'premium',
   *   user_id: '12345',
   *   preferences: { dark_mode: true }
   * });
   * ```
   */
  put(
    data: Record<string, DataLayerValue>,
    expiry: Expiry = 'forever'
  ): Promise<void> {
    return NativeTealiumPrism.dataLayerPut(data, serializeExpiry(expiry));
  }

  /**
   * Get a typed DataItem from the data layer.
   * Mirrors native: `tealium.dataLayer.getDataItem(key:)`.
   *
   * @param key - Key to retrieve
   * @returns Promise resolving to the DataItem or null if not found
   *
   * @example
   * ```typescript
   * const item = await Tealium.dataLayer.getDataItem('user_id');
   * if (item?.type === 'string') console.log(item.value);
   * ```
   */
  async getDataItem(key: string): Promise<DataItem | null> {
    return (await NativeTealiumPrism.dataLayerGetDataItem(
      key
    )) as DataItem | null;
  }

  /**
   * Get a list value from the data layer.
   * Mirrors native: `getDataArray` (Swift) / `getDataList` (Kotlin).
   *
   * @param key - Key to retrieve
   * @returns Promise resolving to the DataList or null if the key is missing
   *   or the stored value is not a list
   */
  async getDataList(key: string): Promise<DataList | null> {
    return (await NativeTealiumPrism.dataLayerGetDataList(
      key
    )) as DataList | null;
  }

  /**
   * Get an object (dictionary) value from the data layer.
   * Mirrors native: `getDataDictionary` (Swift) / `getDataObject` (Kotlin).
   *
   * @param key - Key to retrieve
   * @returns Promise resolving to the DataObject or null if the key is
   *   missing or the stored value is not an object
   */
  async getDataObject(key: string): Promise<DataObject | null> {
    return (await NativeTealiumPrism.dataLayerGetDataObject(
      key
    )) as DataObject | null;
  }

  /**
   * Get a string value from the data layer.
   * Mirrors native: `get<String>(key:as:)` (Swift) / `getString(key)` (Kotlin).
   *
   * @returns Promise resolving to the string value, or null if not found or wrong type
   */
  async getString(key: string): Promise<string | null> {
    const item = await this.getDataItem(key);
    return item?.type === 'string' ? item.value : null;
  }

  /**
   * Get an integer value from the data layer.
   * Mirrors native: `get<Int>(key:as:)` (Swift) / `getInt(key)` (Kotlin).
   *
   * @returns Promise resolving to the number value, or null if not found or wrong type
   */
  async getInt(key: string): Promise<number | null> {
    const item = await this.getDataItem(key);
    return item?.type === 'number' ? Math.trunc(item.value) : null;
  }

  /**
   * Get a double value from the data layer.
   * Mirrors native: `get<Double>(key:as:)` (Swift) / `getDouble(key)` (Kotlin).
   *
   * @returns Promise resolving to the number value, or null if not found or wrong type
   */
  async getDouble(key: string): Promise<number | null> {
    const item = await this.getDataItem(key);
    return item?.type === 'number' ? item.value : null;
  }

  /**
   * Get a boolean value from the data layer.
   * Mirrors native: `get<Bool>(key:as:)` (Swift) / `getBoolean(key)` (Kotlin).
   *
   * @returns Promise resolving to the boolean value, or null if not found or wrong type
   */
  async getBoolean(key: string): Promise<boolean | null> {
    const item = await this.getDataItem(key);
    return item?.type === 'boolean' ? item.value : null;
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
    return NativeTealiumPrism.dataLayerGetAll() as Promise<
      Record<string, unknown>
    >;
  }

  /**
   * Remove one or more keys from the data layer.
   *
   * @param keys - Key or array of keys to remove
   * @returns Promise rejecting with `DATA_LAYER_ERROR` on native failure or
   *   `NOT_INITIALIZED` if Tealium is not yet initialized. Callers that don't
   *   need the result should attach `.catch(log)` to avoid unhandled rejections.
   *
   * @example
   * ```typescript
   * // Remove single key
   * await Tealium.dataLayer.remove('user_id');
   *
   * // Remove multiple keys
   * await Tealium.dataLayer.remove(['user_id', 'user_type']);
   * ```
   */
  remove(keys: string | string[]): Promise<void> {
    return Array.isArray(keys)
      ? NativeTealiumPrism.dataLayerRemoveKeys(keys)
      : NativeTealiumPrism.dataLayerRemove(keys);
  }

  /**
   * Clear all data from the data layer.
   *
   * @returns Promise resolving when clear is complete
   */
  clear(): Promise<void> {
    return NativeTealiumPrism.dataLayerClear();
  }

  /**
   * Subscribe to data layer update events. Called whenever data is added or
   * modified. Mirrors native: `tealium.dataLayer.onDataUpdated.subscribe { ... }`.
   *
   * Multiple subscribers are supported — every JS callback receives every
   * event. The native subscription is created on the first subscribe and
   * disposed when the last subscriber disposes.
   *
   * @param observer - Function called with the updated data
   * @returns Disposable — call dispose() to unsubscribe (idempotent)
   *
   * @example
   * ```typescript
   * const sub = Tealium.dataLayer.onDataUpdated((data) => {
   *   console.log('Data updated:', data);
   * });
   * sub.dispose();
   * ```
   */
  onDataUpdated(observer: DataLayerUpdateCallback): Disposable {
    return this.addEventSubscriber(
      TealiumEvents.DATA_LAYER_UPDATED,
      NativeTealiumPrism.dataLayerOnDataUpdatedSubscribe,
      NativeTealiumPrism.dataLayerOnDataUpdatedDispose,
      (raw) => observer(raw as DataLayerUpdatedEvent)
    );
  }

  /**
   * Subscribe to data layer remove events. Called whenever data is removed.
   * Mirrors native: `tealium.dataLayer.onDataRemoved.subscribe { ... }`.
   *
   * @param observer - Function called with the array of removed keys
   * @returns Disposable — call dispose() to unsubscribe (idempotent)
   */
  onDataRemoved(observer: DataLayerRemoveCallback): Disposable {
    return this.addEventSubscriber(
      TealiumEvents.DATA_LAYER_REMOVED,
      NativeTealiumPrism.dataLayerOnDataRemovedSubscribe,
      NativeTealiumPrism.dataLayerOnDataRemovedDispose,
      (raw) => observer((raw as DataLayerRemovedEvent).keys)
    );
  }

  /**
   * @internal
   * Force teardown of native subscriptions on shutdown. Removes any JS
   * listeners still attached to the emitter and stops native emission.
   */
  _forceDisposeAll(): void {
    for (const eventName of [
      TealiumEvents.DATA_LAYER_UPDATED,
      TealiumEvents.DATA_LAYER_REMOVED,
    ]) {
      if (this.eventEmitter.listenerCount(eventName) > 0) {
        this.eventEmitter.removeAllListeners(eventName);
      }
    }
    NativeTealiumPrism.dataLayerOnDataUpdatedDispose();
    NativeTealiumPrism.dataLayerOnDataRemovedDispose();
  }

  private addEventSubscriber(
    eventName: string,
    nativeSubscribe: () => void,
    nativeDispose: () => void,
    handler: (raw: unknown) => void
  ): Disposable {
    // Source of truth for ref counting is the emitter — addListener() below
    // increments listenerCount(), so check before adding.
    if (this.eventEmitter.listenerCount(eventName) === 0) nativeSubscribe();

    const sub = this.eventEmitter.addListener(eventName, handler);

    let disposed = false;
    return {
      get isDisposed() {
        return disposed;
      },
      dispose: () => {
        if (disposed) return;
        disposed = true;
        sub.remove();
        if (this.eventEmitter.listenerCount(eventName) === 0) nativeDispose();
      },
    };
  }
}

// Note: native `transactionally(block)` is intentionally NOT bridged.
// The native API requires a synchronous callback running on the Tealium
// thread with read-during-transaction semantics, which TurboModule cannot
// provide (no sync native→JS callback). Multi-key `put({...})` and
// `remove([...])` are already atomic on the native side and cover the
// realistic batched-write use cases. See PR #1 description for details.
