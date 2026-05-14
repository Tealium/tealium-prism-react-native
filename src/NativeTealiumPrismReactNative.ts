import { TurboModuleRegistry, type TurboModule } from 'react-native';

/**
 * Consent adapter configuration (TurboModule spec).
 * Mirrors native: CMPAdapter / CmpAdapter
 */
export interface CmpAdapterSpec {
  /** Unique ID for the bridge CMP adapter */
  id: string;
  /** All available consent purposes */
  allPurposes?: string[];
  /** Default consent decision type: 'implicit' or 'explicit' */
  defaultDecisionType?: string;
  /** Default consent decision purposes */
  defaultPurposes?: string[];
}

/**
 * Configuration object for initializing Tealium (TurboModule spec).
 * Mirrors native: TealiumConfig
 */
export interface TealiumConfigSpec {
  /** Tealium account name */
  account: string;
  /** Tealium profile name */
  profile: string;
  /** Environment: 'dev', 'qa', or 'prod' */
  environment: string;
  /** Optional data source key */
  dataSource?: string;
  /** Log level: 'trace', 'debug', 'info', 'warn', 'error', 'silent' */
  logLevel?: string;
  /** Path to local settings JSON file */
  settingsFile?: string;
  /** URL to remote settings JSON file */
  settingsUrl?: string;
  /** Existing visitor ID to use (migration) */
  existingVisitorId?: string;
  /** Key used for visitor identity (cross-device stitching) */
  visitorIdentityKey?: string;
  /** CMP adapter config — presence enables consent management */
  cmpAdapter?: CmpAdapterSpec;
  /** Maximum queue size for offline events */
  maxQueueSize?: number;
  /** Queue expiration in seconds */
  queueExpirationSeconds?: number;
  /** Remote settings refresh interval in seconds */
  refreshIntervalSeconds?: number;
  /** Session timeout in seconds */
  sessionTimeoutSeconds?: number;
}

/**
 * Expiry type for data layer values (TurboModule spec).
 */
export type ExpirySpec = 'session' | 'forever' | 'untilRestart';

/**
 * Data to be tracked with an event or view.
 */
export interface TrackDataSpec {
  /** Name of the event or view */
  name: string;
  /** Type: 'event' or 'view' */
  type: string;
  /** Additional data payload */
  data?: Object;
}

/**
 * Return type for getDataLayerValue (TurboModule spec).
 * Mirrors the DataItem discriminated union from the native SDK.
 * The `value` field is absent for null variants.
 */
export interface DataLayerValueSpec {
  type: string;
  value?: Object;
}

/**
 * Turbo Native Module specification for Tealium Prism React Native.
 *
 * This interface defines all methods available from the native Prism SDKs.
 */
export interface Spec extends TurboModule {
  // ============================================
  // Initialization & Lifecycle
  // ============================================

  /**
   * Initialize the Tealium Prism SDK with the provided configuration.
   * @param config - Configuration object
   * @returns Promise resolving to true when initialization is complete
   */
  initialize(config: TealiumConfigSpec): Promise<boolean>;

  /**
   * Shutdown the Tealium instance and release resources.
   */
  shutdown(): void;

  /**
   * Check if Tealium is currently initialized.
   * @returns Promise resolving to true if initialized
   */
  isInitialized(): Promise<boolean>;

  // ============================================
  // Tracking
  // ============================================

  /**
   * Track an event or view.
   * @param trackData - Track data containing name, type, and optional data payload
   * @returns Promise resolving when tracking is complete
   */
  track(trackData: TrackDataSpec): Promise<void>;

  /**
   * Flush any queued events immediately.
   * @returns Promise resolving when flush is initiated
   */
  flushEventQueue(): Promise<void>;

  // ============================================
  // Data Layer
  // ============================================

  /**
   * Set multiple data layer values at once.
   * The entire record is converted to the native DataObject/DataItem tree by
   * the bridge (iOS: dataObject(from:), Android: readableMapToDataObject()).
   * @param record - Key-value map of values to store
   * @param expiry - Expiry type: 'session', 'forever', or 'untilRestart'
   */
  setDataLayer(record: Object, expiry: ExpirySpec): void;

  /**
   * Get any value from the data layer with type information.
   * @param key - Key to retrieve
   * @returns Promise resolving with object containing type and value, or null
   */
  getDataLayerValue(key: string): Promise<DataLayerValueSpec | null>;

  /**
   * Remove a value from the data layer.
   * @param key - Key to remove
   */
  removeDataLayerValue(key: string): void;

  /**
   * Remove multiple values from the data layer.
   * @param keys - Array of keys to remove
   */
  removeDataLayerValues(keys: string[]): void;

  /**
   * Clear all data from the data layer.
   * @returns Promise resolving when clear is complete
   */
  clearDataLayer(): Promise<void>;

  /**
   * Get all data from the data layer.
   * @returns Promise resolving with all data layer values as an object
   */
  getAllData(): Promise<Object>;

  // ============================================
  // Deep Link
  // ============================================

  /**
   * Handle a deep link URL for attribution and trace management.
   * @param url - The deep link URL to handle
   * @param referrer - Optional referrer URL
   * @returns Promise resolving to true if handled successfully
   */
  handleDeepLink(url: string, referrer: string | null): Promise<boolean>;

  // ============================================
  // Trace
  // ============================================

  /**
   * Join a trace session for debugging.
   * @param traceId - The trace ID to join
   */
  joinTrace(traceId: string): void;

  /**
   * Leave the current trace session.
   */
  leaveTrace(): void;

  // ============================================
  // Visitor / Identity
  // ============================================

  /**
   * Reset the visitor ID to a new anonymous ID.
   * @returns Promise resolving to the new visitor ID
   */
  resetVisitorId(): Promise<string>;

  /**
   * Clear all stored visitor IDs.
   * @returns Promise resolving to the new visitor ID
   */
  clearStoredVisitorIds(): Promise<string>;

  // ============================================
  // Trace (Extended)
  // ============================================

  /**
   * Force end of visitor session for trace purposes.
   */
  forceEndOfVisit(): void;

  // ============================================
  // DataLayer Events
  // ============================================

  /**
   * Enable data layer event listeners.
   * After calling this, TealiumDataLayerUpdated and TealiumDataLayerRemoved
   * events will be emitted via NativeEventEmitter.
   */
  enableDataLayerEvents(): void;

  /**
   * Disable data layer event listeners.
   */
  disableDataLayerEvents(): void;

  // ============================================
  // Event Emitter Support
  // ============================================

  /**
   * Add listener for native events (required for TurboModules with EventEmitter).
   */
  addListener(eventType: string): void;

  /**
   * Remove listeners (required for TurboModules with EventEmitter).
   */
  removeListeners(count: number): void;

  // ============================================
  // Consent
  // ============================================

  /**
   * Set the consent decision from JavaScript.
   * @param decisionType - 'implicit' or 'explicit'
   * @param purposes - Array of consented purpose IDs
   */
  setConsentDecision(decisionType: string, purposes: string[]): void;

  /**
   * Get the current consent decision.
   * @returns Promise resolving to the consent decision object or null
   */
  getConsentDecision(): Promise<Object | null>;

  /**
   * Reset the consent decision (revoke consent).
   */
  resetConsentDecision(): void;

  // ============================================
  // DataLayer Transactional Operations
  // ============================================

  /**
   * Execute a batch of data layer operations atomically.
   * @param keysToRead - Keys to pre-read before executing operations
   * @param operations - Array of put/remove operations
   * @returns Promise with pre-read values as object
   */
  dataLayerTransactionalUpdate(
    keysToRead: string[],
    operations: Object[]
  ): Promise<Object>;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'TealiumPrismReactNative'
);
