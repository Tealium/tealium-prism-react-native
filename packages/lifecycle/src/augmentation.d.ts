import type { LifecycleConfig } from './types';

declare module 'tealium-prism-react-native' {
  interface TealiumConfig {
    lifecycle?: LifecycleConfig;
  }
}
