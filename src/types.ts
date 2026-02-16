/**
 * Tealium Prism React Native Type Definitions
 */

/**
 * Environment options for Tealium configuration.
 */
export type Environment = 'dev' | 'qa' | 'prod';

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
 * MomentsAPI region options.
 */
export type MomentsApiRegion =
  | 'germany'
  | 'us_east'
  | 'sydney'
  | 'oregon'
  | 'tokyo'
  | 'hong_kong';

/**
 * Response from MomentsAPI engine containing visitor profile data.
 */
export interface EngineResponse {
  /**
   * List of audiences the visitor is currently assigned to.
   */
  audiences?: string[];

  /**
   * List of badges assigned to the visitor.
   */
  badges?: string[];

  /**
   * Boolean attributes (flags) assigned to the visitor.
   */
  flags?: Record<string, boolean>;

  /**
   * Date attributes as Unix timestamps in milliseconds.
   */
  dates?: Record<string, number>;

  /**
   * Numeric attributes (metrics) assigned to the visitor.
   */
  metrics?: Record<string, number>;

  /**
   * String attributes (properties) assigned to the visitor.
   */
  properties?: Record<string, string>;
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
   * Enable MomentsAPI module with specified region.
   */
  momentsApiRegion?: MomentsApiRegion;

  /**
   * Enable lifecycle tracking module.
   * @default true
   */
  lifecycleEnabled?: boolean;

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
 * Options for setting data layer values.
 */
export interface DataLayerOptions {
  /**
   * Key to store the value under.
   */
  key: string;

  /**
   * Value to store. Supports string, number, boolean, arrays, and objects.
   */
  value: unknown;

  /**
   * Expiry option for the value.
   * @default 'session'
   */
  expiry?: Expiry;
}

/**
 * Result of initialization.
 */
export interface InitializationResult {
  /**
   * Whether initialization was successful.
   */
  success: boolean;

  /**
   * Error message if initialization failed.
   */
  error?: string;
}

/**
 * Lifecycle event types for manual lifecycle tracking.
 */
export type LifecycleEventType = 'launch' | 'wake' | 'sleep';

/**
 * Event names emitted by the native module.
 * @internal
 */
export const TealiumEvents = {
  DATA_LAYER_UPDATED: 'TealiumDataLayerUpdated',
  DATA_LAYER_REMOVED: 'TealiumDataLayerRemoved',
} as const;

/** @internal */
export type TealiumEventName = (typeof TealiumEvents)[keyof typeof TealiumEvents];

// ============================================
// DataLayer Transactional Operations
// ============================================

/**
 * Type of operation in a transactional update.
 */
export type DataLayerOperationType = 'put' | 'remove';

/**
 * A put operation for transactional data layer updates.
 */
export interface DataLayerPutOperation {
  type: 'put';
  key: string;
  value: unknown;
  expiry?: Expiry;
}

/**
 * A remove operation for transactional data layer updates.
 */
export interface DataLayerRemoveOperation {
  type: 'remove';
  key: string;
}

/**
 * Union type for all data layer operations.
 */
export type DataLayerOperation = DataLayerPutOperation | DataLayerRemoveOperation;

/**
 * Context object passed to the transactionally() callback.
 * Provides methods to read current values and queue operations.
 */
export interface TransactionContext {
  /**
   * Get a value from the data layer.
   * Note: This returns pre-read values, not pending changes from this transaction.
   * @param key - Key to retrieve
   * @returns The current value or undefined if not found
   */
  get(key: string): unknown;

  /**
   * Queue a put operation to store a value.
   * @param key - Key to store the value under
   * @param value - Value to store
   * @param expiry - Expiry option (default: 'session')
   */
  put(key: string, value: unknown, expiry?: Expiry): void;

  /**
   * Queue a remove operation to delete a value.
   * @param key - Key to remove
   */
  remove(key: string): void;
}
