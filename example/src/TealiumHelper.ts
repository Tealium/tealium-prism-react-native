/**
 * TealiumHelper - Singleton for managing Tealium Prism SDK instance
 *
 * This helper provides a centralized way to initialize and interact with
 * the Tealium Prism SDK in React Native applications.
 */

import Tealium, {
  type PrismConfig,
  type TrackData,
  type Expiry,
  type ConsentStatus,
  type ConsentCategory,
  type EngineResponse,
  type DataLayerUpdateCallback,
  type DataLayerRemoveCallback,
  TealiumEvent,
  TealiumView,
} from 'tealium-prism-react-native';

/**
 * Configuration options for the TealiumHelper singleton.
 */
interface TealiumHelperConfig extends PrismConfig {
  // Inherits all PrismConfig options
}

/**
 * Default configuration for development/testing.
 */
const DEFAULT_CONFIG: TealiumHelperConfig = {
  account: 'tealiummobile',
  profile: 'demo',
  environment: 'dev',
};

/**
 * TealiumHelper singleton class for managing the Tealium SDK instance.
 *
 * @example
 * ```typescript
 * // Initialize with custom config
 * await TealiumHelper.initialize({
 *   account: 'your-account',
 *   profile: 'your-profile',
 *   environment: 'prod',
 * });
 *
 * // Track events
 * TealiumHelper.trackEvent('button_click', { button_id: 'submit' });
 *
 * // Track views
 * TealiumHelper.trackView('home_screen');
 * ```
 */
class TealiumHelper {
  private static _instance: TealiumHelper | null = null;
  private _isEnabled: boolean = false;
  private _config: TealiumHelperConfig | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance.
   */
  static get shared(): TealiumHelper {
    if (!TealiumHelper._instance) {
      TealiumHelper._instance = new TealiumHelper();
    }
    return TealiumHelper._instance;
  }

  /**
   * Check if Tealium is currently enabled/initialized.
   */
  get isEnabled(): boolean {
    return this._isEnabled;
  }

  /**
   * Get the current configuration.
   */
  get config(): TealiumHelperConfig | null {
    return this._config;
  }

  /**
   * Initialize Tealium with the provided configuration.
   *
   * @param config - Configuration options (uses defaults if not provided)
   * @returns Promise resolving to true if initialization was successful
   */
  async initialize(config?: Partial<TealiumHelperConfig>): Promise<boolean> {
    const mergedConfig: TealiumHelperConfig = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    console.log('[TealiumHelper] Initializing with config:', {
      account: mergedConfig.account,
      profile: mergedConfig.profile,
      environment: mergedConfig.environment,
    });

    try {
      const success = await Tealium.initialize(mergedConfig);

      if (success) {
        this._isEnabled = true;
        this._config = mergedConfig;
        console.log('[TealiumHelper] Initialization successful');

        // Add some initial data layer values
        Tealium.addData(
          {
            app_name: 'TealiumPrismReactNativeExample',
            sdk_version: '0.1.0',
          },
          'forever'
        );

        return true;
      } else {
        console.error('[TealiumHelper] Initialization failed');
        return false;
      }
    } catch (error) {
      console.error('[TealiumHelper] Initialization error:', error);
      return false;
    }
  }

  /**
   * Initialize with default development configuration.
   */
  async initializeDefault(): Promise<boolean> {
    return this.initialize(DEFAULT_CONFIG);
  }

  /**
   * Shutdown and disable Tealium.
   */
  shutdown(): void {
    if (this._isEnabled) {
      console.log('[TealiumHelper] Shutting down');
      Tealium.shutdown();
      this._isEnabled = false;
      this._config = null;
    }
  }

  /**
   * Track a view/screen.
   *
   * @param viewName - Name of the view/screen
   * @param data - Optional additional data
   */
  trackView(viewName: string, data?: TrackData): void {
    if (!this._isEnabled) {
      console.warn('[TealiumHelper] Not initialized, skipping trackView');
      return;
    }

    console.log('[TealiumHelper] Tracking view:', viewName);
    Tealium.track(new TealiumView(viewName, data));
  }

  /**
   * Track an event.
   *
   * @param eventName - Name of the event
   * @param data - Optional additional data
   */
  trackEvent(eventName: string, data?: TrackData): void {
    if (!this._isEnabled) {
      console.warn('[TealiumHelper] Not initialized, skipping trackEvent');
      return;
    }

    console.log('[TealiumHelper] Tracking event:', eventName);
    Tealium.track(new TealiumEvent(eventName, data));
  }

  /**
   * Add data to the persistent data layer.
   *
   * @param data - Key-value pairs to add
   * @param expiry - Expiry option (default: 'session')
   */
  addData(data: Record<string, unknown>, expiry: Expiry = 'session'): void {
    if (!this._isEnabled) {
      console.warn('[TealiumHelper] Not initialized, skipping addData');
      return;
    }

    Tealium.addData(data, expiry);
  }

  /**
   * Get a value from the data layer.
   *
   * @param key - Key to retrieve
   * @returns The value or null
   */
  async getData(key: string): Promise<unknown> {
    if (!this._isEnabled) {
      return null;
    }

    return Tealium.getData(key);
  }

  /**
   * Remove data from the data layer.
   *
   * @param keys - Key or array of keys to remove
   */
  removeData(keys: string | string[]): void {
    if (!this._isEnabled) {
      return;
    }

    Tealium.removeData(keys);
  }

  /**
   * Join a trace session for debugging.
   *
   * @param traceId - The trace ID to join
   */
  joinTrace(traceId: string): void {
    if (!this._isEnabled) {
      console.warn('[TealiumHelper] Not initialized, skipping joinTrace');
      return;
    }

    console.log('[TealiumHelper] Joining trace:', traceId);
    Tealium.joinTrace(traceId);

    // Track a trace start event
    this.trackEvent('trace_started', { trace_id: traceId });
  }

  /**
   * Leave the current trace session.
   */
  leaveTrace(): void {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Leaving trace');
    Tealium.leaveTrace();
  }

  /**
   * Get the current visitor ID.
   */
  async getVisitorId(): Promise<string | null> {
    if (!this._isEnabled) {
      return null;
    }

    return Tealium.getVisitorId();
  }

  /**
   * Reset the visitor ID.
   */
  async resetVisitorId(): Promise<string | null> {
    if (!this._isEnabled) {
      return null;
    }

    console.log('[TealiumHelper] Resetting visitor ID');
    return Tealium.resetVisitorId();
  }

  /**
   * Clear all stored visitor IDs.
   */
  async clearStoredVisitorIds(): Promise<string | null> {
    if (!this._isEnabled) {
      return null;
    }

    console.log('[TealiumHelper] Clearing stored visitor IDs');
    return Tealium.clearStoredVisitorIds();
  }

  /**
   * Flush the event queue.
   */
  async flush(): Promise<void> {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Flushing event queue');
    return Tealium.flushEventQueue();
  }

  /**
   * Set consent status.
   */
  setConsentStatus(status: ConsentStatus): void {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Setting consent status:', status);
    Tealium.setConsentStatus(status);
  }

  /**
   * Get current consent status.
   */
  async getConsentStatus(): Promise<ConsentStatus> {
    if (!this._isEnabled) {
      return 'unknown';
    }

    return Tealium.getConsentStatus();
  }

  /**
   * Set consent categories.
   */
  setConsentCategories(categories: ConsentCategory[]): void {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Setting consent categories:', categories);
    Tealium.setConsentCategories(categories);
  }

  /**
   * Get current consent categories.
   */
  async getConsentCategories(): Promise<ConsentCategory[]> {
    if (!this._isEnabled) {
      return [];
    }

    return Tealium.getConsentCategories();
  }

  // ============================================
  // MomentsAPI
  // ============================================

  /**
   * Fetch engine response from MomentsAPI.
   *
   * @param engineId - The engine ID to fetch
   * @returns The engine response or null
   */
  async fetchEngineResponse(engineId: string): Promise<EngineResponse | null> {
    if (!this._isEnabled) {
      return null;
    }

    console.log('[TealiumHelper] Fetching engine response for:', engineId);
    return Tealium.fetchEngineResponse(engineId);
  }

  // ============================================
  // Trace (Extended)
  // ============================================

  /**
   * Force end of visitor session.
   */
  forceEndOfVisit(): void {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Forcing end of visit');
    Tealium.forceEndOfVisit();
  }

  // ============================================
  // Lifecycle (Manual)
  // ============================================

  /**
   * Manually track a launch lifecycle event.
   *
   * @param data - Optional additional data
   */
  async lifecycleLaunch(data?: TrackData): Promise<void> {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Lifecycle launch');
    return Tealium.lifecycleLaunch(data);
  }

  /**
   * Manually track a wake lifecycle event.
   *
   * @param data - Optional additional data
   */
  async lifecycleWake(data?: TrackData): Promise<void> {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Lifecycle wake');
    return Tealium.lifecycleWake(data);
  }

  /**
   * Manually track a sleep lifecycle event.
   *
   * @param data - Optional additional data
   */
  async lifecycleSleep(data?: TrackData): Promise<void> {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Lifecycle sleep');
    return Tealium.lifecycleSleep(data);
  }

  // ============================================
  // DataLayer Events
  // ============================================

  /**
   * Subscribe to data layer update events.
   *
   * @param callback - Function to call when data is updated
   * @returns Subscription with remove() method
   */
  onDataUpdated(callback: DataLayerUpdateCallback): { remove: () => void } {
    if (!this._isEnabled) {
      return { remove: () => {} };
    }

    console.log('[TealiumHelper] Subscribing to data layer updates');
    return Tealium.onDataUpdated(callback);
  }

  /**
   * Subscribe to data layer remove events.
   *
   * @param callback - Function to call when data is removed
   * @returns Subscription with remove() method
   */
  onDataRemoved(callback: DataLayerRemoveCallback): { remove: () => void } {
    if (!this._isEnabled) {
      return { remove: () => {} };
    }

    console.log('[TealiumHelper] Subscribing to data layer removals');
    return Tealium.onDataRemoved(callback);
  }
}

// Export the singleton instance and the class
export default TealiumHelper.shared;
export { TealiumHelper };
