/**
 * LifecycleAPI - Interface for manual lifecycle tracking
 *
 * Provides methods for manually tracking app lifecycle events
 * when automatic lifecycle tracking is disabled.
 */

import NativeTealiumPrism from '../NativeTealiumPrismReactNative';
import type { TrackData } from '../types';

/**
 * LifecycleAPI provides methods for manually tracking lifecycle events.
 *
 * Use this when lifecycle tracking is in manual mode (lifecycleEnabled: false
 * or when you need custom lifecycle behavior).
 *
 * @example
 * ```typescript
 * // Track app launch
 * await Tealium.lifecycle.launch({ launch_source: 'deeplink' });
 *
 * // Track app coming to foreground
 * await Tealium.lifecycle.wake();
 *
 * // Track app going to background
 * await Tealium.lifecycle.sleep();
 * ```
 */
export class LifecycleAPI {
  /**
   * Track a launch lifecycle event.
   *
   * Call this when the app is first launched.
   *
   * @param data - Optional additional data to include with the event
   * @returns Promise resolving when tracking is complete
   *
   * @example
   * ```typescript
   * await Tealium.lifecycle.launch({ launch_source: 'notification' });
   * ```
   */
  launch(data?: TrackData): Promise<void> {
    return NativeTealiumPrism.lifecycleLaunch(data as Object | undefined);
  }

  /**
   * Track a wake lifecycle event.
   *
   * Call this when the app comes to the foreground from background.
   *
   * @param data - Optional additional data to include with the event
   * @returns Promise resolving when tracking is complete
   */
  wake(data?: TrackData): Promise<void> {
    return NativeTealiumPrism.lifecycleWake(data as Object | undefined);
  }

  /**
   * Track a sleep lifecycle event.
   *
   * Call this when the app goes to the background.
   *
   * @param data - Optional additional data to include with the event
   * @returns Promise resolving when tracking is complete
   */
  sleep(data?: TrackData): Promise<void> {
    return NativeTealiumPrism.lifecycleSleep(data as Object | undefined);
  }
}
