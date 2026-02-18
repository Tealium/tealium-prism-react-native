/**
 * TealiumHelper - Singleton for managing the Tealium Prism SDK.
 *
 * Use startTealium() to create the instance and apply initial data layer;
 * stopTealium() to shut down; flush() to send the event queue.
 */

import Tealium, {
  type TealiumConfig,
  type TrackData,
  type Expiry,
  type EngineResponse,
} from 'tealium-prism-react-native';

/**
 * Configuration options for the TealiumHelper singleton.
 */
interface TealiumHelperConfig extends TealiumConfig {
  // Inherits all TealiumConfig options
}

/**
 * Default config: remote settings URL, trace logging, visitor identity key "email".
 * Override with startTealium({ ... }) or initialize({ ... }).
 */
const DEFAULT_CONFIG: TealiumHelperConfig = {
  account: 'tealiummobile',
  profile: 'demo',
  environment: 'dev',
  settingsFile: 'TealiumSettings',
  settingsUrl:
    'https://tags.tiqcdn.com/dle/tealiummobile/lib/example_settings.json',
  logLevel: 'debug',
  visitorIdentityKey: 'email',
};

/**
 * TealiumHelper singleton class for managing the Tealium SDK instance.
 *
 * @example
 * ```typescript
 * await TealiumHelper.startTealium();
 * TealiumHelper.trackView('home_screen');
 * TealiumHelper.trackEvent('button_click', { button_id: 'submit' });
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
   * Create the SDK instance with the given config (merged with defaults).
   * @param config - Optional overrides; omit to use DEFAULT_CONFIG
   * @returns true if creation succeeded
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
   * Create the SDK and apply initial data layer (key, key2, key3 removed, key4 incremented).
   * Use this for a one-shot "start" that matches the usual demo setup.
   * Uses transactionally() for atomic updates (mirrors Swift/Kotlin examples).
   */
  async startTealium(config?: Partial<TealiumHelperConfig>): Promise<boolean> {
    const success = await this.initialize(config ?? DEFAULT_CONFIG);
    if (!success) return false;

    // Use transactionally for atomic updates (mirrors Swift/Kotlin example)
    await Tealium.dataLayer.transactionally(
      (ctx) => {
        ctx.put('key', 'value', 'forever');
        ctx.put('key2', 'value2', 'forever');
        ctx.remove('key3');
        const count = (ctx.get('key4') as number) ?? 0;
        ctx.put('key4', count + 1, 'forever');
      },
      ['key4']
    );

    return true;
  }

  /**
   * Shut down the SDK and clear the instance.
   */
  stopTealium(): void {
    this.shutdown();
  }

  /**
   * Shutdown the SDK and release resources. Call create/startTealium again to reuse.
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
  // Tracking
  // ============================================

  /**
   * Track a screen/view. Data is attached to the dispatch.
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
   * Track an event with optional payload.
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
   * Send the event queue immediately (e.g. before backgrounding).
   */
  async flush(): Promise<void> {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Flushing event queue');
    return Tealium.flushEventQueue();
  }

  // ============================================
  // Data Layer
  // ============================================

  /**
   * Add key-value pairs to the data layer. Included on every subsequent dispatch.
   * @param expiry - 'session' | 'forever' | 'untilRestart'
   */
  addData(data: Record<string, unknown>, expiry: Expiry = 'session'): void {
    if (!this._isEnabled) {
      console.warn('[TealiumHelper] Not initialized, skipping addData');
      return;
    }

    Tealium.dataLayer.put(data, expiry);
  }

  /**
   * Read a value from the data layer by key.
   */
  async getData(key: string): Promise<unknown> {
    if (!this._isEnabled) {
      return null;
    }

    return Tealium.dataLayer.get(key);
  }

  /**
   * Remove one or more keys from the data layer.
   */
  removeData(keys: string | string[]): void {
    if (!this._isEnabled) {
      return;
    }

    Tealium.dataLayer.remove(keys);
  }

  /**
   * Subscribe to data layer updates. Call remove() on the returned object to unsubscribe.
   */
  onDataUpdated(callback: (data: Record<string, unknown>) => void): {
    remove: () => void;
  } {
    if (!this._isEnabled) {
      return { remove: () => {} };
    }

    console.log('[TealiumHelper] Subscribing to data layer updates');
    return Tealium.dataLayer.onUpdated(callback);
  }

  /**
   * Subscribe to data layer removals. Call remove() on the returned object to unsubscribe.
   */
  onDataRemoved(callback: (keys: string[]) => void): {
    remove: () => void;
  } {
    if (!this._isEnabled) {
      return { remove: () => {} };
    }

    console.log('[TealiumHelper] Subscribing to data layer removals');
    return Tealium.dataLayer.onRemoved(callback);
  }

  // ============================================
  // Trace
  // ============================================

  /**
   * Join a trace session (e.g. for Tealium iQ debugging).
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
   */
  leaveTrace(): void {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Leaving trace');
    Tealium.trace.leave();
  }

  /**
   * Force end of the current visit (e.g. for trace/testing).
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
   * Generate a new visitor ID (existing identity associations remain).
   */
  async resetVisitorId(): Promise<string | null> {
    if (!this._isEnabled) {
      return null;
    }

    console.log('[TealiumHelper] Resetting visitor ID');
    return Tealium.resetVisitorId();
  }

  /**
   * Clear stored visitor IDs and get a new anonymous ID.
   */
  async clearStoredVisitorIds(): Promise<string | null> {
    if (!this._isEnabled) {
      return null;
    }

    console.log('[TealiumHelper] Clearing stored visitor IDs');
    return Tealium.clearStoredVisitorIds();
  }

  // ============================================
  // Deep Link
  // ============================================

  /**
   * Pass a deep link URL to Prism for attribution and trace. Call when the app receives a link.
   * @returns true if the URL was handled
   */
  async handleDeepLink(
    url: string,
    referrer?: string | null
  ): Promise<boolean> {
    if (!this._isEnabled) {
      return false;
    }

    return Tealium.deepLink.handle(url, referrer ?? undefined);
  }

  // ============================================
  // MomentsAPI
  // ============================================

  /**
   * Fetch the Moments API engine response for the given engine ID.
   * Requires MomentsAPI module and region configured in settings.
   */
  async fetchEngineResponse(engineId: string): Promise<EngineResponse | null> {
    if (!this._isEnabled) {
      return null;
    }

    console.log('[TealiumHelper] Fetching engine response for:', engineId);
    return Tealium.momentsAPI.fetchEngineResponse(engineId);
  }

  // ============================================
  // Lifecycle (manual)
  // ============================================

  /**
   * Manually fire a launch lifecycle event (e.g. when auto-tracking is off).
   */
  async lifecycleLaunch(data?: TrackData): Promise<void> {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Lifecycle launch');
    return Tealium.lifecycle.launch(data);
  }

  /**
   * Manually fire a wake lifecycle event.
   */
  async lifecycleWake(data?: TrackData): Promise<void> {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Lifecycle wake');
    return Tealium.lifecycle.wake(data);
  }

  /**
   * Manually fire a sleep lifecycle event.
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
