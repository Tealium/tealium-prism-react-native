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
 * Per-purpose dispatcher mapping (TurboModule spec).
 */
export interface ConsentPurposeSpec {
  purposeId: string;
  dispatcherIds: string[];
}

/**
 * Programmatic consent configuration (TurboModule spec).
 * Mirrors the native `ConsentConfigurationBuilder` block.
 */
export interface ConsentConfigurationSpec {
  tealiumPurposeId: string;
  purposes?: ConsentPurposeSpec[];
  refireDispatcherIds?: string[];
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
  /** Programmatic consent configuration (purpose → dispatcher mapping) */
  consentConfiguration?: ConsentConfigurationSpec;
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
 *
 * String values map to named constants. Time-based variants are serialized
 * by DataLayerAPI as `"afterSeconds:<n>"` or `"afterEpochSeconds:<n>"` before
 * reaching native — the bridge parses and reconstructs native Expiry objects.
 */
export type ExpirySpec = string;

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
 * Return type for dataLayerGetDataItem (TurboModule spec).
 * Mirrors the DataItem discriminated union from the native SDK.
 * The `value` field is absent for null variants.
 */
export interface DataLayerValueSpec {
  type: string;
  value?: Object;
}

/**
 * Wire-format enriched dispatch payload (TurboModule spec).
 * Mirrors native: Dispatch (Swift/Kotlin)
 */
export interface DispatchSpec {
  /** UUID identifying this dispatch. */
  id: string;
  /** Unix timestamp in milliseconds when the dispatch was created. */
  timestamp: number;
  /** Full enriched event payload including SDK-collected metadata. */
  payload: Object;
}

/**
 * Wire-format result of a track or forceEndOfVisit call.
 * Native sends raw status string; TypeScript layer maps to typed union.
 */
export interface TrackResultSpec {
  status: string;
  info: string;
  dispatch: DispatchSpec;
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
   * Resolves once native teardown returns. Always resolves; native shutdown is sync and infallible.
   */
  shutdown(): Promise<void>;

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
  track(trackData: TrackDataSpec): Promise<TrackResultSpec>;

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
   * @returns Promise rejecting with `DATA_LAYER_ERROR` on native failure or
   *   `NOT_INITIALIZED` if Tealium is not yet initialized.
   */
  dataLayerPut(record: Object, expiry: ExpirySpec): Promise<void>;

  /**
   * Get any value from the data layer with type information.
   * @param key - Key to retrieve
   * @returns Promise resolving with object containing type and value, or null
   */
  dataLayerGetDataItem(key: string): Promise<DataLayerValueSpec | null>;

  /**
   * Get a list value from the data layer.
   * Mirrors native: getDataArray (Swift) / getDataList (Kotlin).
   * @param key - Key to retrieve
   * @returns Promise resolving with an array of DataItems, or null if the
   *   key is missing or the value is not a list
   */
  dataLayerGetDataList(key: string): Promise<Object | null>;

  /**
   * Get an object (dictionary) value from the data layer.
   * Mirrors native: getDataDictionary (Swift) / getDataObject (Kotlin).
   * @param key - Key to retrieve
   * @returns Promise resolving with a {key: DataItem} map, or null if the
   *   key is missing or the value is not an object
   */
  dataLayerGetDataObject(key: string): Promise<Object | null>;

  /**
   * Remove a value from the data layer.
   * @param key - Key to remove
   * @returns Promise rejecting with `DATA_LAYER_ERROR` on native failure or
   *   `NOT_INITIALIZED` if Tealium is not yet initialized.
   */
  dataLayerRemove(key: string): Promise<void>;

  /**
   * Remove multiple values from the data layer.
   * @param keys - Array of keys to remove
   * @returns Promise rejecting with `DATA_LAYER_ERROR` on native failure or
   *   `NOT_INITIALIZED` if Tealium is not yet initialized.
   */
  dataLayerRemoveKeys(keys: string[]): Promise<void>;

  /**
   * Clear all data from the data layer.
   * @returns Promise resolving when clear is complete
   */
  dataLayerClear(): Promise<void>;

  /**
   * Get all data from the data layer.
   * @returns Promise resolving with all data layer values as an object
   */
  dataLayerGetAll(): Promise<Object>;

  // ============================================
  // Deep Link
  // ============================================

  /**
   * Handle a deep link URL for attribution and trace management.
   * @param url - The deep link URL to handle
   * @param referrer - Optional referrer URL
   * @returns Promise resolving to true if handled successfully
   */
  deepLinkHandle(url: string, referrer: string | null): Promise<boolean>;

  // ============================================
  // Trace
  // ============================================

  /**
   * Join a trace session for debugging.
   * @param traceId - The trace ID to join
   */
  traceJoin(traceId: string): Promise<void>;

  /**
   * Leave the current trace session.
   */
  traceLeave(): Promise<void>;

  /**
   * Force end of visitor session for trace purposes.
   */
  traceForceEndOfVisit(): Promise<TrackResultSpec>;

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
  // DataLayer Events
  // ============================================

  /**
   * Subscribe to the native onDataUpdated stream. The native side starts
   * emitting TealiumDataLayerUpdated events through NativeEventEmitter.
   * Idempotent on the native side — only the first JS subscriber should
   * call this.
   */
  dataLayerOnDataUpdatedSubscribe(): void;

  /**
   * Dispose the native onDataUpdated subscription. Stops emission.
   */
  dataLayerOnDataUpdatedDispose(): void;

  /**
   * Subscribe to the native onDataRemoved stream. The native side starts
   * emitting TealiumDataLayerRemoved events through NativeEventEmitter.
   */
  dataLayerOnDataRemovedSubscribe(): void;

  /**
   * Dispose the native onDataRemoved subscription. Stops emission.
   */
  dataLayerOnDataRemovedDispose(): void;

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
   * @returns Promise rejecting with `CONSENT_NOT_ENABLED` if `cmpAdapter` was
   *   not provided in the config; rejecting with `INVALID_DECISION_TYPE` if
   *   `decisionType` is not parseable.
   */
  consentSetDecision(decisionType: string, purposes: string[]): Promise<void>;

  /**
   * Get the current consent decision.
   * @returns Promise resolving to the consent decision object or null
   */
  consentGetDecision(): Promise<Object | null>;

  /**
   * Reset the consent decision (revoke consent).
   * @returns Promise rejecting with `CONSENT_NOT_ENABLED` if `cmpAdapter` was
   *   not provided in the config.
   */
  consentReset(): Promise<void>;

  /**
   * Get all purposes the CMP adapter knows about.
   * Mirrors native: CMPAdapter.allPurposes / CmpAdapter.allPurposes.
   * Returns null when consent is not enabled or adapter has no purposes set.
   */
  consentGetAllPurposes(): Promise<string[] | null>;

  /**
   * Subscribe to the native consentDecision observable. The native side
   * starts emitting TealiumConsentDecisionChanged events through
   * NativeEventEmitter. Idempotent on the native side — only the first JS
   * subscriber should call this.
   */
  consentOnDecisionChangedSubscribe(): void;

  /**
   * Dispose the native consentDecision subscription. Stops emission.
   */
  consentOnDecisionChangedDispose(): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'TealiumPrismReactNative'
);
