/**
 * TealiumHelper - Singleton for managing Tealium Prism SDK instance
 *
 * This helper provides a centralized way to initialize and interact with
 * the Tealium Prism SDK in React Native applications.
 *
 * Uses the new object-oriented API that mirrors the native Swift/Kotlin SDKs.
 */

import Tealium, {
  type TealiumConfig,
  type TrackData,
  type Expiry,
  type ConsentStatus,
  type ConsentCategory,
  type EngineResponse,
} from 'tealium-prism-react-native';

/**
 * Configuration options for the TealiumHelper singleton.
 */
interface TealiumHelperConfig extends TealiumConfig {
  // Inherits all TealiumConfig options
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
 * // Track events (mirrors native: tealium.track(name, type, data))
 * TealiumHelper.trackEvent('button_click', { button_id: 'submit' });
 *
 * // Track views
 * TealiumHelper.trackView('home_screen');
 *
 * // Use data layer (mirrors native: tealium.dataLayer)
 * TealiumHelper.addData({ user_type: 'premium' }, 'session');
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
   * Mirrors native: Tealium.create(config:)
   *
   * @param config - Configuration options (uses defaults if not provided)
   * @returns Promise resolving to true if initialization was successful
   */
  async initialize(config?: Partial<TealiumHelperConfig>): Promise<boolean> {
    const mergedConfig: TealiumHelperConfig = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    console.log('[TealiumHelper] Creating instance with config:', {
      account: mergedConfig.account,
      profile: mergedConfig.profile,
      environment: mergedConfig.environment,
    });

    try {
      // Use new API: Tealium.create() instead of Tealium.initialize()
      const success = await Tealium.create(mergedConfig);

      if (success) {
        this._isEnabled = true;
        this._config = mergedConfig;
        console.log('[TealiumHelper] Instance created successfully');

        // Add some initial data layer values using new API: Tealium.dataLayer.put()
        Tealium.dataLayer.put(
          {
            app_name: 'TealiumPrismReactNativeExample',
            sdk_version: '0.1.0',
          },
          'forever'
        );

        return true;
      } else {
        console.error('[TealiumHelper] Instance creation failed');
        return false;
      }
    } catch (error) {
      console.error('[TealiumHelper] Creation error:', error);
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
   * Mirrors native: tealium.shutdown()
   */
  shutdown(): void {
    if (this._isEnabled) {
      console.log('[TealiumHelper] Shutting down');
      Tealium.shutdown();
      this._isEnabled = false;
      this._config = null;
    }
  }

  // ============================================
  // Tracking (mirrors native: tealium.track())
  // ============================================

  /**
   * Track a view/screen.
   * Mirrors native: tealium.track(name, .view, data)
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
    Tealium.track(viewName, 'view', data);
  }

  /**
   * Track an event.
   * Mirrors native: tealium.track(name, .event, data)
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
    Tealium.track(eventName, 'event', data);
  }

  /**
   * Flush the event queue.
   * Mirrors native: tealium.flushEventQueue()
   */
  async flush(): Promise<void> {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Flushing event queue');
    return Tealium.flushEventQueue();
  }

  // ============================================
  // Data Layer (mirrors native: tealium.dataLayer)
  // ============================================

  /**
   * Add data to the persistent data layer.
   * Mirrors native: tealium.dataLayer.put(data, expiry)
   *
   * @param data - Key-value pairs to add
   * @param expiry - Expiry option (default: 'session')
   */
  addData(data: Record<string, unknown>, expiry: Expiry = 'session'): void {
    if (!this._isEnabled) {
      console.warn('[TealiumHelper] Not initialized, skipping addData');
      return;
    }

    Tealium.dataLayer.put(data, expiry);
  }

  /**
   * Get a value from the data layer.
   * Mirrors native: tealium.dataLayer.get(key)
   *
   * @param key - Key to retrieve
   * @returns The value or null
   */
  async getData(key: string): Promise<unknown> {
    if (!this._isEnabled) {
      return null;
    }

    return Tealium.dataLayer.get(key);
  }

  /**
   * Remove data from the data layer.
   * Mirrors native: tealium.dataLayer.remove(key)
   *
   * @param keys - Key or array of keys to remove
   */
  removeData(keys: string | string[]): void {
    if (!this._isEnabled) {
      return;
    }

    Tealium.dataLayer.remove(keys);
  }

  /**
   * Subscribe to data layer update events.
   * Mirrors native: tealium.dataLayer.onDataUpdated
   *
   * @param callback - Function to call when data is updated
   * @returns Subscription with remove() method
   */
  onDataUpdated(callback: (data: Record<string, unknown>) => void): { remove: () => void } {
    if (!this._isEnabled) {
      return { remove: () => {} };
    }

    console.log('[TealiumHelper] Subscribing to data layer updates');
    return Tealium.dataLayer.onUpdated(callback);
  }

  /**
   * Subscribe to data layer remove events.
   * Mirrors native: tealium.dataLayer.onDataRemoved
   *
   * @param callback - Function to call when data is removed
   * @returns Subscription with remove() method
   */
  onDataRemoved(callback: (keys: string[]) => void): { remove: () => void } {
    if (!this._isEnabled) {
      return { remove: () => {} };
    }

    console.log('[TealiumHelper] Subscribing to data layer removals');
    return Tealium.dataLayer.onRemoved(callback);
  }

  // ============================================
  // Trace (mirrors native: tealium.trace)
  // ============================================

  /**
   * Join a trace session for debugging.
   * Mirrors native: tealium.trace.join(id)
   *
   * @param traceId - The trace ID to join
   */
  joinTrace(traceId: string): void {
    if (!this._isEnabled) {
      console.warn('[TealiumHelper] Not initialized, skipping joinTrace');
      return;
    }

    console.log('[TealiumHelper] Joining trace:', traceId);
    Tealium.trace.join(traceId);

    // Track a trace start event
    this.trackEvent('trace_started', { trace_id: traceId });
  }

  /**
   * Leave the current trace session.
   * Mirrors native: tealium.trace.leave()
   */
  leaveTrace(): void {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Leaving trace');
    Tealium.trace.leave();
  }

  /**
   * Force end of visitor session.
   * Mirrors native: tealium.trace.forceEndOfVisit()
   */
  forceEndOfVisit(): void {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Forcing end of visit');
    Tealium.trace.forceEndOfVisit();
  }

  // ============================================
  // Visitor Identity
  // ============================================

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
   * Mirrors native: tealium.resetVisitorId()
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
   * Mirrors native: tealium.clearStoredVisitorIds()
   */
  async clearStoredVisitorIds(): Promise<string | null> {
    if (!this._isEnabled) {
      return null;
    }

    console.log('[TealiumHelper] Clearing stored visitor IDs');
    return Tealium.clearStoredVisitorIds();
  }

  // ============================================
  // Consent (mirrors native: tealium.consent)
  // ============================================

  /**
   * Set consent status.
   * Mirrors native: (stored in dataLayer for now)
   */
  setConsentStatus(status: ConsentStatus): void {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Setting consent status:', status);
    Tealium.consent.setStatus(status);
  }

  /**
   * Get current consent status.
   */
  async getConsentStatus(): Promise<ConsentStatus> {
    if (!this._isEnabled) {
      return 'unknown';
    }

    return Tealium.consent.getStatus();
  }

  /**
   * Set consent categories.
   */
  setConsentCategories(categories: ConsentCategory[]): void {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Setting consent categories:', categories);
    Tealium.consent.setCategories(categories);
  }

  /**
   * Get current consent categories.
   */
  async getConsentCategories(): Promise<ConsentCategory[]> {
    if (!this._isEnabled) {
      return [];
    }

    return Tealium.consent.getCategories();
  }

  // ============================================
  // MomentsAPI (mirrors native: tealium.momentsAPI())
  // ============================================

  /**
   * Fetch engine response from MomentsAPI.
   * Mirrors native: tealium.momentsAPI().fetchEngineResponse(engineId)
   *
   * @param engineId - The engine ID to fetch
   * @returns The engine response or null
   */
  async fetchEngineResponse(engineId: string): Promise<EngineResponse | null> {
    if (!this._isEnabled) {
      return null;
    }

    console.log('[TealiumHelper] Fetching engine response for:', engineId);
    return Tealium.momentsAPI.fetchEngineResponse(engineId);
  }

  // ============================================
  // Lifecycle (mirrors native: tealium.lifecycle())
  // ============================================

  /**
   * Manually track a launch lifecycle event.
   * Mirrors native: tealium.lifecycle().launch(data)
   *
   * @param data - Optional additional data
   */
  async lifecycleLaunch(data?: TrackData): Promise<void> {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Lifecycle launch');
    return Tealium.lifecycle.launch(data);
  }

  /**
   * Manually track a wake lifecycle event.
   * Mirrors native: tealium.lifecycle().wake(data)
   *
   * @param data - Optional additional data
   */
  async lifecycleWake(data?: TrackData): Promise<void> {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Lifecycle wake');
    return Tealium.lifecycle.wake(data);
  }

  /**
   * Manually track a sleep lifecycle event.
   * Mirrors native: tealium.lifecycle().sleep(data)
   *
   * @param data - Optional additional data
   */
  async lifecycleSleep(data?: TrackData): Promise<void> {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Lifecycle sleep');
    return Tealium.lifecycle.sleep(data);
  }
}

// Export the singleton instance and the class
export default TealiumHelper.shared;
export { TealiumHelper };
