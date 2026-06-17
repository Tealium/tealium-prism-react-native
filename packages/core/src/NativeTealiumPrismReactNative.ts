import { TurboModuleRegistry, type TurboModule } from "react-native";

export interface Spec extends TurboModule {
  getSdkVersion(): Promise<string>;
}

// Use the non-throwing getter so JS-only environments (web fallback, Jest)
// can import this module without a registered native binding.
export default TurboModuleRegistry.get<Spec>("TealiumPrismReactNative");
