/**
 * Tealium Prism React Native
 *
 * React Native wrapper for the Tealium Prism mobile SDKs (iOS and Android).
 * Provides a unified TypeScript API for event tracking, data layer management,
 * consent handling, and visitor identity management.
 */

import { NativeEventEmitter } from 'react-native';
import NativeTealiumPrism from './NativeTealiumPrismReactNative';
import type { PrismConfigSpec, TrackDataSpec } from './NativeTealiumPrismReactNative';

// Re-export types
export * from './types';
export { TealiumView, TealiumEvent } from './types';

import type {
  PrismConfig,
  TrackOptions,
  TrackData,
  Expiry,
  ConsentStatus,
  ConsentCategory,
  EngineResponse,
  DataLayerUpdateCallback,
  DataLayerRemoveCallback,
} from './types';
import { TealiumEvents } from './types';

// Create event emitter for native events
const eventEmitter = new NativeEventEmitter(NativeTealiumPrism as any);

/**
 * Main Tealium Prism class providing the public API.
 *
 * Use this class to initialize Tealium, track events/views,
 * manage the data layer, and handle consent.
 *
 * @example
 * ```typescript
 * import Tealium, { TealiumEvent, TealiumView } from 'tealium-prism-react-native';
 *
 * // Initialize
 * await Tealium.initialize({
 *   account: 'your-account',
 *   profile: 'your-profile',
 *   environment: 'dev',
 * });
 *
 * // Track an event
 * Tealium.track(new TealiumEvent('button_click', { button_id: 'submit' }));
 *
 * // Track a view
 * Tealium.track(new TealiumView('home_screen'));
 * ```
 */
export default class Tealium {
  // Track internal initialization state
  private static _initialized = false;

  /**
   * Check if Tealium has been initialized (synchronous).
   * Use `isInitialized()` for async native check.
   */
  static get hasInitialized(): boolean {
    return Tealium._initialized;
  }

  // ============================================
  // Initialization & Lifecycle
  // ============================================

  /**
   * Initialize the Tealium Prism SDK with the provided configuration.
   *
   * @param config - Configuration object with account, profile, environment, and optional settings
   * @returns Promise resolving to true when initialization is complete
   * @throws Error if initialization fails
   *
   * @example
   * ```typescript
   * const success = await Tealium.initialize({
   *   account: 'tealiummobile',
   *   profile: 'demo',
   *   environment: 'dev',
   *   logLevel: 'debug',
   * });
   * ```
   */
  static async initialize(config: PrismConfig): Promise<boolean> {
    const nativeConfig: PrismConfigSpec = {
      account: config.account,
      profile: config.profile,
      environment: config.environment,
      dataSource: config.dataSource,
      logLevel: config.logLevel,
      settingsFile: config.settingsFile,
      settingsUrl: config.settingsUrl,
      existingVisitorId: config.existingVisitorId,
      visitorIdentityKey: config.visitorIdentityKey,
      momentsApiRegion: config.momentsApiRegion,
      lifecycleEnabled: config.lifecycleEnabled,
    };

    const result = await NativeTealiumPrism.initialize(nativeConfig);
    Tealium._initialized = result;

    // Add plugin metadata to data layer
    if (result) {
      NativeTealiumPrism.setDataLayerString(
        'plugin_name',
        'Tealium-Prism-ReactNative',
        'forever'
      );
      NativeTealiumPrism.setDataLayerString('plugin_version', '0.1.0', 'forever');
    }

    return result;
  }

  /**
   * Shutdown the Tealium instance and release all resources.
   * After calling this, you must call initialize() again to use Tealium.
   */
  static shutdown(): void {
    NativeTealiumPrism.shutdown();
    Tealium._initialized = false;
  }

  /**
   * Check if Tealium is currently initialized.
   *
   * @returns Promise resolving to true if Tealium is initialized
   */
  static async isInitialized(): Promise<boolean> {
    return NativeTealiumPrism.isInitialized();
  }

  // ============================================
  // Tracking
  // ============================================

  /**
   * Track an event or view.
   *
   * @param dispatch - TrackOptions object or TealiumEvent/TealiumView instance
   * @returns Promise resolving when tracking is complete
   *
   * @example
   * ```typescript
   * // Using TealiumEvent class
   * await Tealium.track(new TealiumEvent('purchase', { order_id: '12345' }));
   *
   * // Using TealiumView class
   * await Tealium.track(new TealiumView('product_detail', { product_id: 'abc' }));
   *
   * // Using plain object
   * await Tealium.track({ name: 'custom_event', type: 'event', data: { key: 'value' } });
   * ```
   */
  static async track(dispatch: TrackOptions): Promise<void> {
    const trackData: TrackDataSpec = {
      name: dispatch.name,
      type: dispatch.type ?? 'event',
      data: dispatch.data as Object | undefined,
    };
    return NativeTealiumPrism.track(trackData);
  }

  /**
   * Convenience method to track a view.
   *
   * @param viewName - Name of the view/screen
   * @param data - Optional additional data
   * @returns Promise resolving when tracking is complete
   */
  static async trackView(viewName: string, data?: TrackData): Promise<void> {
    return Tealium.track({ name: viewName, type: 'view', data });
  }

  /**
   * Convenience method to track an event.
   *
   * @param eventName - Name of the event
   * @param data - Optional additional data
   * @returns Promise resolving when tracking is complete
   */
  static async trackEvent(eventName: string, data?: TrackData): Promise<void> {
    return Tealium.track({ name: eventName, type: 'event', data });
  }

  /**
   * Flush any queued events immediately.
   * Useful when you need to ensure events are sent before the app closes.
   *
   * @returns Promise resolving when flush is initiated
   */
  static async flushEventQueue(): Promise<void> {
    return NativeTealiumPrism.flushEventQueue();
  }

  // ============================================
  // Data Layer
  // ============================================

  /**
   * Add data to the persistent data layer.
   * Data added here will be included with every tracking call.
   *
   * @param data - Object containing key-value pairs to add
   * @param expiry - Expiry option: 'session', 'forever', or 'untilRestart'
   *
   * @example
   * ```typescript
   * Tealium.addData({
   *   user_type: 'premium',
   *   user_id: '12345',
   * }, 'session');
   * ```
   */
  static addData(data: Record<string, unknown>, expiry: Expiry = 'session'): void {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        NativeTealiumPrism.setDataLayerString(key, value, expiry);
      } else if (typeof value === 'number') {
        NativeTealiumPrism.setDataLayerNumber(key, value, expiry);
      } else if (typeof value === 'boolean') {
        NativeTealiumPrism.setDataLayerBoolean(key, value, expiry);
      } else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
        NativeTealiumPrism.setDataLayerStringArray(key, value as string[], expiry);
      } else if (typeof value === 'object' && value !== null) {
        NativeTealiumPrism.setDataLayerObject(key, value as Object, expiry);
      }
    }
  }

  /**
   * Get a value from the data layer.
   *
   * @param key - Key to retrieve
   * @returns Promise resolving to the value or null if not found
   */
  static async getData(key: string): Promise<unknown> {
    // Try different types in order of likelihood
    const stringValue = await NativeTealiumPrism.getDataLayerString(key);
    if (stringValue !== null) return stringValue;

    const numberValue = await NativeTealiumPrism.getDataLayerNumber(key);
    if (numberValue !== null) return numberValue;

    const boolValue = await NativeTealiumPrism.getDataLayerBoolean(key);
    if (boolValue !== null) return boolValue;

    const arrayValue = await NativeTealiumPrism.getDataLayerStringArray(key);
    if (arrayValue !== null) return arrayValue;

    const objectValue = await NativeTealiumPrism.getDataLayerObject(key);
    if (objectValue !== null) return objectValue;

    return null;
  }

  /**
   * Remove a value from the data layer.
   *
   * @param keys - Key or array of keys to remove
   */
  static removeData(keys: string | string[]): void {
    if (Array.isArray(keys)) {
      NativeTealiumPrism.removeDataLayerValues(keys);
    } else {
      NativeTealiumPrism.removeDataLayerValue(keys);
    }
  }

  // ============================================
  // Trace
  // ============================================

  /**
   * Join a trace session for debugging in Tealium's Event Stream Live.
   *
   * @param traceId - The trace ID to join
   *
   * @example
   * ```typescript
   * Tealium.joinTrace('abc123');
   * // ... track events ...
   * Tealium.leaveTrace();
   * ```
   */
  static joinTrace(traceId: string): void {
    NativeTealiumPrism.joinTrace(traceId);
  }

  /**
   * Leave the current trace session.
   */
  static leaveTrace(): void {
    NativeTealiumPrism.leaveTrace();
  }

  // ============================================
  // Visitor / Identity
  // ============================================

  /**
   * Get the current visitor ID.
   *
   * @returns Promise resolving to the visitor ID or null
   */
  static async getVisitorId(): Promise<string | null> {
    return NativeTealiumPrism.getVisitorId();
  }

  /**
   * Reset the visitor ID to a new anonymous ID.
   * The new ID will still be associated with any current identity.
   *
   * @returns Promise resolving to the new visitor ID
   */
  static async resetVisitorId(): Promise<string> {
    return NativeTealiumPrism.resetVisitorId();
  }

  /**
   * Clear all stored visitor IDs and generate a new anonymous ID.
   * This effectively creates a new anonymous visitor.
   *
   * @returns Promise resolving to the new visitor ID
   */
  static async clearStoredVisitorIds(): Promise<string> {
    return NativeTealiumPrism.clearStoredVisitorIds();
  }

  // ============================================
  // Consent
  // ============================================

  /**
   * Set the user's consent status.
   *
   * @param status - Consent status: 'consented', 'notConsented', or 'unknown'
   */
  static setConsentStatus(status: ConsentStatus): void {
    NativeTealiumPrism.setConsentStatus(status);
  }

  /**
   * Get the current consent status.
   *
   * @returns Promise resolving to the consent status
   */
  static async getConsentStatus(): Promise<ConsentStatus> {
    const status = await NativeTealiumPrism.getConsentStatus();
    return status as ConsentStatus;
  }

  /**
   * Set the consented categories.
   *
   * @param categories - Array of consent category strings
   */
  static setConsentCategories(categories: ConsentCategory[]): void {
    NativeTealiumPrism.setConsentCategories(categories);
  }

  /**
   * Get the current consent categories.
   *
   * @returns Promise resolving to array of consent category strings
   */
  static async getConsentCategories(): Promise<ConsentCategory[]> {
    const categories = await NativeTealiumPrism.getConsentCategories();
    return categories as ConsentCategory[];
  }

  // ============================================
  // MomentsAPI
  // ============================================

  /**
   * Fetch the engine response for the current visitor from MomentsAPI.
   * Returns personalization data including audiences, badges, and attributes.
   *
   * @param engineId - The engine ID to fetch data from
   * @returns Promise resolving to EngineResponse or null if not available
   *
   * @example
   * ```typescript
   * const response = await Tealium.fetchEngineResponse('my-engine-id');
   * if (response) {
   *   console.log('Audiences:', response.audiences);
   *   console.log('Badges:', response.badges);
   * }
   * ```
   */
  static async fetchEngineResponse(engineId: string): Promise<EngineResponse | null> {
    const response = await NativeTealiumPrism.fetchEngineResponse(engineId);
    return response as EngineResponse | null;
  }

  // ============================================
  // Trace (Extended)
  // ============================================

  /**
   * Force end of the current visitor session.
   * This triggers the end of visit processing in Tealium.
   */
  static forceEndOfVisit(): void {
    NativeTealiumPrism.forceEndOfVisit();
  }

  // ============================================
  // Lifecycle (Manual)
  // ============================================

  /**
   * Manually track a launch lifecycle event.
   * Use this when lifecycle tracking is in manual mode.
   *
   * @param data - Optional additional data to include with the event
   * @returns Promise resolving when tracking is complete
   *
   * @example
   * ```typescript
   * // Track launch with custom data
   * await Tealium.lifecycleLaunch({ launch_source: 'deeplink' });
   * ```
   */
  static async lifecycleLaunch(data?: TrackData): Promise<void> {
    return NativeTealiumPrism.lifecycleLaunch(data as Object | undefined);
  }

  /**
   * Manually track a wake lifecycle event.
   * Use this when lifecycle tracking is in manual mode.
   *
   * @param data - Optional additional data to include with the event
   * @returns Promise resolving when tracking is complete
   */
  static async lifecycleWake(data?: TrackData): Promise<void> {
    return NativeTealiumPrism.lifecycleWake(data as Object | undefined);
  }

  /**
   * Manually track a sleep lifecycle event.
   * Use this when lifecycle tracking is in manual mode.
   *
   * @param data - Optional additional data to include with the event
   * @returns Promise resolving when tracking is complete
   */
  static async lifecycleSleep(data?: TrackData): Promise<void> {
    return NativeTealiumPrism.lifecycleSleep(data as Object | undefined);
  }

  // ============================================
  // DataLayer Events
  // ============================================

  // Store subscriptions for cleanup
  private static _dataLayerUpdateSubscription: any = null;
  private static _dataLayerRemoveSubscription: any = null;

  /**
   * Subscribe to data layer update events.
   * Called whenever data is added or modified in the data layer.
   *
   * @param callback - Function called with the updated data
   * @returns Subscription object - call remove() to unsubscribe
   *
   * @example
   * ```typescript
   * const subscription = Tealium.onDataUpdated((data) => {
   *   console.log('Data updated:', data);
   * });
   *
   * // Later, to unsubscribe:
   * subscription.remove();
   * ```
   */
  static onDataUpdated(callback: DataLayerUpdateCallback): { remove: () => void } {
    // Enable native events if this is the first listener
    if (!Tealium._dataLayerUpdateSubscription) {
      NativeTealiumPrism.enableDataLayerEvents();
    }

    const subscription = eventEmitter.addListener(
      TealiumEvents.DATA_LAYER_UPDATED,
      callback as (data: unknown) => void
    );

    Tealium._dataLayerUpdateSubscription = subscription;

    return {
      remove: () => {
        subscription.remove();
        Tealium._dataLayerUpdateSubscription = null;
        // Disable native events if no more listeners
        if (!Tealium._dataLayerRemoveSubscription) {
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
   *
   * @example
   * ```typescript
   * const subscription = Tealium.onDataRemoved((keys) => {
   *   console.log('Keys removed:', keys);
   * });
   *
   * // Later, to unsubscribe:
   * subscription.remove();
   * ```
   */
  static onDataRemoved(callback: DataLayerRemoveCallback): { remove: () => void } {
    // Enable native events if this is the first listener
    if (!Tealium._dataLayerRemoveSubscription) {
      NativeTealiumPrism.enableDataLayerEvents();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = eventEmitter.addListener(
      TealiumEvents.DATA_LAYER_REMOVED,
      (event: any) => callback(event.keys as string[])
    );

    Tealium._dataLayerRemoveSubscription = subscription;

    return {
      remove: () => {
        subscription.remove();
        Tealium._dataLayerRemoveSubscription = null;
        // Disable native events if no more listeners
        if (!Tealium._dataLayerUpdateSubscription) {
          NativeTealiumPrism.disableDataLayerEvents();
        }
      },
    };
  }
}
