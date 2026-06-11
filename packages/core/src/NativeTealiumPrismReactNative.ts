import { TurboModuleRegistry, type TurboModule } from 'react-native';

// PR0: empty TurboModule. No Prism methods are bridged yet — this only proves
// the wrapper's native module is linked and resolvable end-to-end. Prism APIs
// arrive in later PRs.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Spec extends TurboModule {}

// Use the non-throwing getter so JS-only environments (web fallback, Jest)
// can import this module without a registered native binding.
export default TurboModuleRegistry.get<Spec>('TealiumPrismReactNative');
