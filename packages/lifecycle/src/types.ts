/**
 * Configuration for the Lifecycle module, passed inside TealiumConfig.lifecycle at create() time.
 *
 * Mirrors: LifecycleSettingsBuilder (Swift/Kotlin native SDK)
 */
export interface LifecycleConfig {
  /** When false, lifecycle events must be sent manually. Default true. */
  autoTracking?: boolean;
  /**
   * Minutes of background inactivity before the next foreground is treated as a new launch.
   * Pass -1 for an infinite session. Default 1440 (1 day).
   */
  sessionTimeoutInMinutes?: number;
  /**
   * Which events receive lifecycle data. Default 'lifecycleEventsOnly'.
   * 'allEvents' adds lifecycle data to every tracked event.
   */
  dataTarget?: 'lifecycleEventsOnly' | 'allEvents';
  /** Subset of lifecycle events to send. Default: all three. */
  trackedLifecycleEvents?: ('launch' | 'wake' | 'sleep')[];
}
