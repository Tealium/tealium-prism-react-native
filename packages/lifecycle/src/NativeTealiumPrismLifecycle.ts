import { TurboModuleRegistry, type TurboModule } from 'react-native';

/**
 * TurboModule spec for the Lifecycle package.
 * Runtime API (launch/wake/sleep) after Tealium.create().
 * Module registration (configure) happens natively via BridgeModule protocol.
 */
export interface Spec extends TurboModule {
  lifecycleLaunch(instanceKey: string, data: Object | null): Promise<void>;
  lifecycleWake(instanceKey: string, data: Object | null): Promise<void>;
  lifecycleSleep(instanceKey: string, data: Object | null): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('TealiumPrismLifecycle');
