/**
 * Tealium Prism React Native Type Definitions
 */

/**
 * Environment options for Tealium configuration.
 */
export type Environment = 'dev' | 'qa' | 'prod';

/**
 * Consent decision type.
 * Mirrors native: ConsentDecision.DecisionType (Swift/Kotlin)
 *
 * - `implicit`: Consent derived from user action (e.g., app launch in implied-consent jurisdictions).
 * - `explicit`: Consent purposefully given by the user (e.g., accepted privacy policy).
 */
export type ConsentDecisionType = 'implicit' | 'explicit';

/**
 * Represents a user's consent decision from a Consent Management Provider.
 * Mirrors native: ConsentDecision (Swift/Kotlin)
 */
export interface ConsentDecision {
  /**
   * The category of decision: implicit (derived) or explicit (user-given).
   */
  decisionType: ConsentDecisionType;

  /**
   * The set of purposes the user has consented to (e.g., 'analytics', 'marketing').
   */
  purposes: string[];
}

/**
 * Log level options for SDK logging.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Data expiry options for data layer values.
 */
export type Expiry = 'session' | 'forever' | 'untilRestart';

/**
 * Dispatch type for tracking calls.
 */
export type DispatchType = 'event' | 'view';

/**
 * Configuration for the bridge CMP adapter used for consent management.
 * Mirrors the native CmpAdapter/CMPAdapter pattern.
 */
export interface CmpAdapterConfig {
  /**
   * Unique ID for the adapter. Must match the key used for ConsentConfiguration
   * in local/remote settings JSON.
   * @default 'react-native-bridge'
   */
  id?: string;

  /**
   * All purposes the CMP can manage. Used by the SDK to determine whether
   * all purposes have been consented to.
   */
  allPurposes?: string[];

  /**
   * Consent decision to use on first launch or after reset, and to restore
   * across app restarts when no persisted decision exists.
   */
  defaultDecision?: ConsentDecision;
}

/**
 * Configuration object for initializing Tealium.
 * Mirrors native: TealiumConfig (Swift/Kotlin)
 */
export interface TealiumConfig {
  /**
   * Tealium account name.
   * @required
   */
  account: string;

  /**
   * Tealium profile name.
   * @required
   */
  profile: string;

  /**
   * Environment to use: 'dev', 'qa', or 'prod'.
   * @required
   */
  environment: Environment;

  /**
   * Optional data source key for identifying this data source.
   */
  dataSource?: string;

  /**
   * Log level for SDK logging.
   * @default 'error'
   */
  logLevel?: LogLevel;

  /**
   * Path to local settings JSON file bundled with the app.
   * Used for local configuration fallback.
   */
  settingsFile?: string;

  /**
   * URL to remote settings JSON file.
   * Used for remote configuration updates.
   */
  settingsUrl?: string;

  /**
   * Existing visitor ID to use instead of generating a new one.
   * Useful for migrating users from another analytics system.
   */
  existingVisitorId?: string;

  /**
   * Key used to identify visitors (e.g., 'email', 'user_id').
   * Used for cross-device visitor stitching.
   */
  visitorIdentityKey?: string;

  /**
   * Configuration for the bridge CMP adapter.
   * When provided, consent management is enabled.
   * Mirrors native: TealiumConfig.cmpAdapter (Swift/Kotlin)
   */
  cmpAdapter?: CmpAdapterConfig;

  // ============================================
  // Core Settings (Advanced)
  // ============================================

  /**
   * Maximum number of events to store in the queue when offline.
   * When this limit is reached, oldest events are removed first (FIFO).
   * @default 100
   */
  maxQueueSize?: number;

  /**
   * Maximum time in seconds an event can remain in the queue.
   * Events older than this are removed without being sent.
   * @default 86400 (1 day)
   */
  queueExpirationSeconds?: number;

  /**
   * Minimum time in seconds between remote settings refreshes.
   * Settings are always refreshed on app startup if settingsUrl is provided.
   * @default 900 (15 minutes)
   */
  refreshIntervalSeconds?: number;

  /**
   * Session timeout in seconds. Time of inactivity before session ends.
   * Value is coerced between 5 seconds and 30 minutes.
   * @default 300 (5 minutes)
   */
  sessionTimeoutSeconds?: number;
}

/**
 * Data payload for tracking events and views.
 * Supports string, number, boolean, and nested objects.
 */
export type TrackData = Record<string, unknown>;

/**
 * Options for a tracking call.
 */
export interface TrackOptions {
  /**
   * Name of the event or view.
   * @required
   */
  name: string;

  /**
   * Type of tracking: 'event' or 'view'.
   * @default 'event'
   */
  type?: DispatchType;

  /**
   * Additional data payload to include with the track call.
   */
  data?: TrackData;
}

/**
 * Represents a view tracking call.
 */
export class TealiumView implements TrackOptions {
  public readonly name: string;
  public readonly type: DispatchType = 'view';
  public readonly data?: TrackData;

  constructor(viewName: string, data?: TrackData) {
    this.name = viewName;
    this.data = data;
  }
}

/**
 * Represents an event tracking call.
 */
export class TealiumEvent implements TrackOptions {
  public readonly name: string;
  public readonly type: DispatchType = 'event';
  public readonly data?: TrackData;

  constructor(eventName: string, data?: TrackData) {
    this.name = eventName;
    this.data = data;
  }
}

/**
 * A valid data layer value. Mirrors the JSON value set supported by the native SDK
 * (DataItem variants: string, number, boolean, null, list, object).
 *
 * `undefined` is intentionally excluded — pass null to represent absence of a value.
 * If native DataItem variants are added in the future (e.g. Date), extend this type
 * in lockstep with the native bridge changes.
 */
export type DataLayerValue =
  | string
  | number
  | boolean
  | null
  | DataLayerValue[]
  | { [key: string]: DataLayerValue };

/**
 * Options for setting data layer values.
 */
export interface DataLayerOptions {
  /**
   * Key to store the value under.
   */
  key: string;

  /**
   * Value to store. Supports string, number, boolean, null, arrays, and objects.
   */
  value: DataLayerValue;

  /**
   * Expiry option for the value.
   * @default 'forever'
   */
  expiry?: Expiry;
}

/**
 * A typed value from the Tealium data layer.
 * Mirrors native: DataItem (Swift/Kotlin)
 *
 * Discriminated union matching the native SDK type hierarchy.
 */
export type DataItem =
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'boolean'; value: boolean }
  | { type: 'null' }
  | { type: 'list'; value: DataItem[] }
  | { type: 'object'; value: Record<string, DataItem> };

/**
 * A heterogeneous list of DataItems.
 * Mirrors native: DataList (Kotlin) / [DataItem] (Swift)
 */
export type DataList = DataItem[];

/**
 * A heterogeneous map of DataItems.
 * Mirrors native: DataObject (Kotlin) / [String: DataItem] (Swift)
 */
export type DataObject = Record<string, DataItem>;

/**
 * A resource that can be disposed.
 * Mirrors native: Disposable (Swift/Kotlin)
 */
export interface Disposable {
  /** Whether this resource has been disposed. Idempotent — multiple dispose() calls are safe. */
  readonly isDisposed: boolean;
  /** Releases the resource. */
  dispose(): void;
}

/**
 * Event names emitted by the native module.
 * @internal
 */
export const TealiumEvents = {
  DATA_LAYER_UPDATED: 'TealiumDataLayerUpdated',
  DATA_LAYER_REMOVED: 'TealiumDataLayerRemoved',
} as const;

/** @internal */
export type TealiumEventName =
  (typeof TealiumEvents)[keyof typeof TealiumEvents];
