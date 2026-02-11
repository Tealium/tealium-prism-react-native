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
 * Consent status options.
 */
export type ConsentStatus = 'consented' | 'notConsented' | 'unknown';

/**
 * Consent categories that can be set.
 */
export type ConsentCategory =
  | 'analytics'
  | 'affiliates'
  | 'displayAds'
  | 'email'
  | 'personalization'
  | 'search'
  | 'social'
  | 'bigData'
  | 'mobile'
  | 'engagement'
  | 'monitoring'
  | 'crm'
  | 'cdp'
  | 'cookieMatch'
  | 'misc';

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
 * Configuration object for initializing Tealium Prism.
 */
export interface PrismConfig {
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
 * Callback for data layer update events.
 */
export type DataLayerUpdateCallback = (data: Record<string, unknown>) => void;

/**
 * Callback for data layer remove events.
 */
export type DataLayerRemoveCallback = (keys: string[]) => void;

/**
 * Event names emitted by the native module.
 */
export const TealiumEvents = {
  DATA_LAYER_UPDATED: 'TealiumDataLayerUpdated',
  DATA_LAYER_REMOVED: 'TealiumDataLayerRemoved',
} as const;

export type TealiumEventName = (typeof TealiumEvents)[keyof typeof TealiumEvents];
