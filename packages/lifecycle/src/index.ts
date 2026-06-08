import NativeLifecycle from './NativeTealiumPrismLifecycle';

export type { LifecycleConfig } from './types';
// Re-export augmentation so consumers get TealiumConfig.lifecycle when importing this package.
export type {} from './augmentation';

/**
 * Runtime API for the Lifecycle module.
 * Call launch/wake/sleep manually when autoTracking is disabled.
 * Construct via createLifecycleAPI() after Tealium.create().
 */
export class LifecycleAPI {
  constructor(private instanceKey: string) {}

  /** Send a launch event. Only use when autoTracking is false. */
  launch(data?: Record<string, unknown>): Promise<void> {
    return NativeLifecycle.lifecycleLaunch(this.instanceKey, data ?? null);
  }

  /** Send a wake event. Only use when autoTracking is false. */
  wake(data?: Record<string, unknown>): Promise<void> {
    return NativeLifecycle.lifecycleWake(this.instanceKey, data ?? null);
  }

  /** Send a sleep event. Only use when autoTracking is false. */
  sleep(data?: Record<string, unknown>): Promise<void> {
    return NativeLifecycle.lifecycleSleep(this.instanceKey, data ?? null);
  }
}

/**
 * Returns a LifecycleAPI instance bound to the current Tealium instance.
 * Must be called after Tealium.create().
 *
 * @example
 * ```ts
 * import Tealium from 'tealium-prism-react-native';
 * import { createLifecycleAPI } from 'tealium-prism-lifecycle-react-native';
 *
 * await Tealium.create({ ..., lifecycle: { autoTracking: false } });
 * const lifecycle = createLifecycleAPI();
 * await lifecycle.launch();
 * ```
 */
export function createLifecycleAPI(): LifecycleAPI {
  // Access the static _instanceKey set by Tealium.create() in the core package.
  // Using a type-only cast to avoid a hard runtime import cycle.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const core = require('tealium-prism-react-native') as { Tealium: { _instanceKey: string | null } };
  const key = core.Tealium._instanceKey;
  if (!key) {
    throw new Error('[TealiumLifecycle] Call Tealium.create() before accessing lifecycle API');
  }
  return new LifecycleAPI(key);
}
