/**
 * TealiumHelper - Singleton for managing the Tealium Prism SDK.
 *
 * Use startTealium() to create the instance and apply initial data layer;
 * stopTealium() to shut down; flush() to send the event queue.
 */

import Tealium, {
  type TealiumConfig,
  type TrackData,
  type TrackResult,
  type Expiry,
  type DataItem,
  type DataLayerValue,
  type ConsentDecision,
  type ConsentDecisionType,
  type Disposable as TealiumDisposable,
} from 'tealium-prism-react-native';

// Used by helpers when the SDK is not enabled — keeps the Disposable contract
// without holding any native subscription.
const DISPOSED_NOOP: TealiumDisposable = {
  get isDisposed() {
    return true;
  },
  dispose() {},
};

function unwrapDataItem(item: DataItem | null): unknown {
  if (item === null) return null;
  switch (item.type) {
    case 'null':
      return null;
    case 'string':
    case 'number':
    case 'boolean':
      return item.value;
    case 'list':
      return item.value.map(unwrapDataItem);
    case 'object':
      return Object.fromEntries(
        Object.entries(item.value).map(([k, v]) => [k, unwrapDataItem(v)])
      );
  }
}

/**
 * Default config: remote settings URL, trace logging, visitor identity key "email".
 * Override with startTealium({ ... }) or initialize({ ... }).
 */
const DEFAULT_CONFIG: TealiumConfig = {
  account: 'tealiummobile',
  profile: 'demo',
  environment: 'dev',
  settingsFile: 'TealiumSettings',
  settingsUrl:
    'https://tags.tiqcdn.com/dle/tealiummobile/lib/example_settings.json',
  logLevel: 'debug',
  visitorIdentityKey: 'email',
  cmpAdapter: {
    allPurposes: ['analytics', 'marketing', 'personalization'],
  },
  // Programmatic purpose mapping. Mirrors the native example apps:
  // tealium SDK requires the 'analytics' purpose; 'collect' dispatcher
  // additionally requires 'marketing'.
  consentConfiguration: {
    tealiumPurposeId: 'analytics',
    purposes: [{ purposeId: 'marketing', dispatcherIds: ['collect'] }],
    refireDispatcherIds: ['collect'],
  },
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
  private _config: TealiumConfig | null = null;

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
  get config(): TealiumConfig | null {
    return this._config;
  }

  /**
   * Create the SDK instance with the given config (merged with defaults).
   * @param config - Optional overrides; omit to use DEFAULT_CONFIG
   * @returns true if creation succeeded
   */
  async initialize(config?: Partial<TealiumConfig>): Promise<boolean> {
    const mergedConfig: TealiumConfig = {
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
   * Create the SDK and apply initial data layer (key/key2 set, key3 removed,
   * key4 incremented).
   */
  async startTealium(config?: Partial<TealiumConfig>): Promise<boolean> {
    const success = await this.initialize(config ?? DEFAULT_CONFIG);
    if (!success) return false;

    // RMW on key4 — bridge cannot offer atomic transaction across IPC, so the
    // read and write are explicitly two operations.
    const item = await Tealium.dataLayer.getDataItem('key4');
    const count = item?.type === 'number' ? item.value : 0;

    Tealium.dataLayer.put(
      { key: 'value', key2: 'value2', key4: count + 1 },
      'forever'
    );
    Tealium.dataLayer.remove('key3');

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
  addData(
    data: Record<string, DataLayerValue>,
    expiry: Expiry = 'session'
  ): void {
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

    return unwrapDataItem(await Tealium.dataLayer.getDataItem(key));
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
   * Get a list value from the data layer by key.
   */
  async getListData(key: string): Promise<unknown[] | null> {
    if (!this._isEnabled) {
      return null;
    }

    const list = await Tealium.dataLayer.getDataList(key);
    return list?.map(unwrapDataItem) ?? null;
  }

  /**
   * Get all data from the data layer.
   */
  async getAllData(): Promise<Record<string, unknown>> {
    if (!this._isEnabled) {
      return {};
    }

    return Tealium.dataLayer.getAll();
  }

  /**
   * Clear all data from the data layer.
   */
  async clearDataLayer(): Promise<void> {
    if (!this._isEnabled) {
      return;
    }

    return Tealium.dataLayer.clear();
  }

  /**
   * Subscribe to data layer updates. Call dispose() on the returned object to unsubscribe.
   */
  onDataUpdated(
    callback: (data: Record<string, unknown>) => void
  ): TealiumDisposable {
    if (!this._isEnabled) {
      return DISPOSED_NOOP;
    }

    console.log('[TealiumHelper] Subscribing to data layer updates');
    return Tealium.dataLayer.onDataUpdated(callback);
  }

  /**
   * Subscribe to data layer removals. Call dispose() on the returned object to unsubscribe.
   */
  onDataRemoved(callback: (keys: string[]) => void): TealiumDisposable {
    if (!this._isEnabled) {
      return DISPOSED_NOOP;
    }

    console.log('[TealiumHelper] Subscribing to data layer removals');
    return Tealium.dataLayer.onDataRemoved(callback);
  }

  // ============================================
  // Trace
  // ============================================

  /**
   * Join a trace session (e.g. for Tealium iQ debugging).
   */
  async joinTrace(traceId: string): Promise<void> {
    if (!this._isEnabled) {
      console.warn('[TealiumHelper] Not initialized, skipping joinTrace');
      return;
    }

    console.log('[TealiumHelper] Joining trace:', traceId);
    return Tealium.trace.join(traceId);
  }

  /**
   * Leave the current trace session.
   */
  async leaveTrace(): Promise<void> {
    if (!this._isEnabled) {
      return;
    }

    console.log('[TealiumHelper] Leaving trace');
    return Tealium.trace.leave();
  }

  /**
   * Force end of the current visit (e.g. for trace/testing).
   * @returns The TrackResult for the end-of-visit dispatch, or null if not initialized.
   */
  async forceEndOfVisit(): Promise<TrackResult | null> {
    if (!this._isEnabled) {
      return null;
    }

    console.log('[TealiumHelper] Forcing end of visit');
    return Tealium.trace.forceEndOfVisit();
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
  // Consent
  // ============================================

  setConsentDecision(
    decisionType: ConsentDecisionType,
    purposes: string[]
  ): void {
    if (!this._isEnabled) {
      console.warn(
        '[TealiumHelper] Not initialized, skipping setConsentDecision'
      );
      return;
    }

    Tealium.consent.setDecision(decisionType, purposes);
  }

  async getConsentDecision(): Promise<ConsentDecision | null> {
    if (!this._isEnabled) {
      return null;
    }

    return Tealium.consent.getDecision();
  }

  resetConsentDecision(): void {
    if (!this._isEnabled) {
      return;
    }

    Tealium.consent.reset();
  }

  async getAllConsentPurposes(): Promise<string[] | null> {
    if (!this._isEnabled) {
      return null;
    }
    return Tealium.consent.getAllPurposes();
  }

  /**
   * Subscribe to consent decision change events. Fires whenever decision is
   * pushed via setDecision or cleared via reset. Call dispose() to unsubscribe.
   */
  onConsentDecisionChanged(
    callback: (decision: ConsentDecision | null) => void
  ): TealiumDisposable {
    if (!this._isEnabled) {
      return DISPOSED_NOOP;
    }
    return Tealium.consent.onDecisionChanged(callback);
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
}

// Export the singleton instance and the class
export default TealiumHelper.shared;
export { TealiumHelper };
