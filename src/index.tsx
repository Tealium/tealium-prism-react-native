/**
 * Tealium Prism React Native
 *
 * React Native wrapper for the Tealium Prism mobile SDKs (iOS and Android).
 * Provides a unified TypeScript API that mirrors the native SDK structure.
 *
 * The API is designed to closely match the native Swift/Kotlin SDKs:
 * - `Tealium.dataLayer` - Data layer management
 * - `Tealium.trace` - Trace/debugging functionality
 * - `Tealium.deepLink` - Deep link handling
 * - `Tealium.lifecycle` - Manual lifecycle tracking
 * - `Tealium.momentsAPI` - Moments API integration
 * - `Tealium.consent` - Consent management
 */

import { NativeEventEmitter } from 'react-native';
import NativeTealiumPrism from './NativeTealiumPrismReactNative';
import type {
  TealiumConfigSpec,
  TrackDataSpec,
} from './NativeTealiumPrismReactNative';

// Sub-API imports
import {
  DataLayerAPI,
  TraceAPI,
  DeepLinkAPI,
  LifecycleAPI,
  MomentsAPIHandler,
  ConsentAPI,
} from './api';

// Re-export types
export * from './types';
export { TealiumView, TealiumEvent } from './types';

// Re-export API types
export type { DataLayerUpdateCallback, DataLayerRemoveCallback } from './api';

import type { TealiumConfig, TrackData, DispatchType } from './types';

// Create event emitter for native events (singleton)
const eventEmitter = new NativeEventEmitter(NativeTealiumPrism as any);

/**
 * Main Tealium Prism class providing the public API.
 *
 * The API structure mirrors the native Swift/Kotlin SDKs:
 * - Sub-modules accessible via lazy getters (dataLayer, trace, deepLink, etc.)
 * - Core methods directly on the class (track, create, shutdown, etc.)
 *
 * @example
 * ```typescript
 * import Tealium from 'tealium-prism-react-native';
 *
 * // Create instance (mirrors native: Tealium.create(config:))
 * await Tealium.create({
 *   account: 'your-account',
 *   profile: 'your-profile',
 *   environment: 'dev',
 * });
 *
 * // Track an event (mirrors native: tealium.track(name, type, data))
 * Tealium.track('button_click', 'event', { button_id: 'submit' });
 *
 * // Use data layer (mirrors native: tealium.dataLayer.put(...))
 * Tealium.dataLayer.put({ user_type: 'premium' }, 'session');
 *
 * // Use trace (mirrors native: tealium.trace.join(...))
 * Tealium.trace.join('abc123');
 * ```
 */
export default class Tealium {
  // ============================================
  // Internal State
  // ============================================

  private static _initialized = false;

  // Lazy-initialized sub-API instances (mirrors native SDK pattern)
  private static _dataLayer: DataLayerAPI | null = null;
  private static _trace: TraceAPI | null = null;
  private static _deepLink: DeepLinkAPI | null = null;
  private static _lifecycle: LifecycleAPI | null = null;
  private static _momentsAPI: MomentsAPIHandler | null = null;
  private static _consent: ConsentAPI | null = null;

  // ============================================
  // Sub-API Getters (mirrors native SDK)
  // ============================================

  /**
   * Interface for accessing and manipulating the data layer.
   *
   * Mirrors native: `tealium.dataLayer`
   *
   * @example
   * ```typescript
   * Tealium.dataLayer.put({ user_id: '123' }, 'session');
   * const value = await Tealium.dataLayer.get('user_id');
   * Tealium.dataLayer.remove('user_id');
   * ```
   */
  static get dataLayer(): DataLayerAPI {
    if (!this._dataLayer) {
      this._dataLayer = new DataLayerAPI(eventEmitter);
    }
    return this._dataLayer;
  }

  /**
   * Manager for trace-related functionality.
   *
   * Mirrors native: `tealium.trace`
   *
   * @example
   * ```typescript
   * Tealium.trace.join('trace-id');
   * Tealium.trace.leave();
   * Tealium.trace.forceEndOfVisit();
   * ```
   */
  static get trace(): TraceAPI {
    if (!this._trace) {
      this._trace = new TraceAPI();
    }
    return this._trace;
  }

  /**
   * Manager for deep link functionality.
   *
   * Mirrors native: `tealium.deepLink`
   *
   * @example
   * ```typescript
   * await Tealium.deepLink.handle('myapp://product/123');
   * ```
   */
  static get deepLink(): DeepLinkAPI {
    if (!this._deepLink) {
      this._deepLink = new DeepLinkAPI();
    }
    return this._deepLink;
  }

  /**
   * Manager for manual lifecycle tracking.
   *
   * Mirrors native: `tealium.lifecycle()`
   *
   * @example
   * ```typescript
   * await Tealium.lifecycle.launch();
   * await Tealium.lifecycle.wake();
   * await Tealium.lifecycle.sleep();
   * ```
   */
  static get lifecycle(): LifecycleAPI {
    if (!this._lifecycle) {
      this._lifecycle = new LifecycleAPI();
    }
    return this._lifecycle;
  }

  /**
   * Manager for Moments API integration.
   *
   * Mirrors native: `tealium.momentsAPI()`
   *
   * @example
   * ```typescript
   * const response = await Tealium.momentsAPI.fetchEngineResponse('engine-id');
   * ```
   */
  static get momentsAPI(): MomentsAPIHandler {
    if (!this._momentsAPI) {
      this._momentsAPI = new MomentsAPIHandler();
    }
    return this._momentsAPI;
  }

  /**
   * Manager for consent management.
   *
   * Mirrors native: `CMPAdapter` / `CmpAdapter` pattern
   *
   * Requires `consentEnabled: true` in the config passed to `Tealium.create()`.
   *
   * @example
   * ```typescript
   * Tealium.consent.setDecision('explicit', ['analytics', 'marketing']);
   * const decision = await Tealium.consent.getDecision();
   * Tealium.consent.reset();
   * ```
   */
  static get consent(): ConsentAPI {
    if (!this._consent) {
      this._consent = new ConsentAPI();
    }
    return this._consent;
  }

  // ============================================
  // Initialization & Lifecycle
  // ============================================

  /**
   * Check if Tealium has been initialized (synchronous, based on local state).
   * For authoritative native state, use `isInitialized()`.
   */
  static get isReady(): boolean {
    return Tealium._initialized;
  }

  /**
   * Check if Tealium is initialized by querying the native module.
   *
   * Mirrors native: checks whether a Tealium instance exists.
   *
   * @returns Promise resolving to true if initialized on native side
   */
  static async isInitialized(): Promise<boolean> {
    const nativeState = await NativeTealiumPrism.isInitialized();
    Tealium._initialized = nativeState;
    return nativeState;
  }

  /**
   * Creates a new Tealium instance with the provided configuration.
   *
   * Mirrors native: `Tealium.create(config:)`
   *
   * @param config - Configuration object with account, profile, environment, and optional settings
   * @returns Promise resolving to true when creation is complete
   * @throws Error if creation fails
   *
   * @example
   * ```typescript
   * const success = await Tealium.create({
   *   account: 'tealiummobile',
   *   profile: 'demo',
   *   environment: 'dev',
   *   logLevel: 'debug',
   * });
   * ```
   */
  static async create(config: TealiumConfig): Promise<boolean> {
    // Pass config directly - all fields are mapped 1:1
    const result = await NativeTealiumPrism.initialize(
      config as TealiumConfigSpec
    );
    Tealium._initialized = result;

    // Add plugin metadata to data layer
    if (result) {
      this.dataLayer.put(
        {
          plugin_name: 'Tealium-Prism-ReactNative',
          plugin_version: '0.1.0',
        },
        'forever'
      );
    }

    return result;
  }

  /**
   * Shutdown the Tealium instance and release all resources.
   *
   * Mirrors native: `tealium.shutdown()` (Kotlin) / deinit (Swift)
   *
   * After calling this, you must call create() again to use Tealium.
   */
  static shutdown(): void {
    NativeTealiumPrism.shutdown();
    Tealium._initialized = false;

    // Reset lazy instances
    this._dataLayer = null;
    this._trace = null;
    this._deepLink = null;
    this._lifecycle = null;
    this._momentsAPI = null;
    this._consent = null;
  }

  // ============================================
  // Tracking
  // ============================================

  /**
   * Track an event or view.
   *
   * Mirrors native: `tealium.track(name, type, data)`
   *
   * @param name - Name of the event or view
   * @param type - Type of dispatch: 'event' or 'view' (default: 'event')
   * @param data - Optional additional data payload
   * @returns Promise resolving when tracking is complete
   *
   * @example
   * ```typescript
   * // Track an event
   * await Tealium.track('button_click', 'event', { button_id: 'submit' });
   *
   * // Track a view
   * await Tealium.track('product_detail', 'view', { product_id: 'abc' });
   *
   * // Simple event (type defaults to 'event')
   * await Tealium.track('user_login');
   * ```
   */
  static async track(
    name: string,
    type: DispatchType = 'event',
    data?: TrackData
  ): Promise<void> {
    const trackData: TrackDataSpec = {
      name,
      type,
      data: data as Object | undefined,
    };
    return NativeTealiumPrism.track(trackData);
  }

  /**
   * Flush any queued events immediately.
   *
   * Mirrors native: `tealium.flushEventQueue()`
   *
   * @returns Promise resolving when flush is initiated
   */
  static flushEventQueue(): Promise<void> {
    return NativeTealiumPrism.flushEventQueue();
  }

  // ============================================
  // Visitor / Identity
  // ============================================

  /**
   * Reset the visitor ID to a new anonymous ID.
   *
   * Mirrors native: `tealium.resetVisitorId()`
   *
   * The new ID will still be associated with any current identity.
   *
   * @returns Promise resolving to the new visitor ID
   */
  static resetVisitorId(): Promise<string> {
    return NativeTealiumPrism.resetVisitorId();
  }

  /**
   * Clear all stored visitor IDs and generate a new anonymous ID.
   *
   * Mirrors native: `tealium.clearStoredVisitorIds()`
   *
   * This effectively creates a new anonymous visitor.
   *
   * @returns Promise resolving to the new visitor ID
   */
  static clearStoredVisitorIds(): Promise<string> {
    return NativeTealiumPrism.clearStoredVisitorIds();
  }
}
