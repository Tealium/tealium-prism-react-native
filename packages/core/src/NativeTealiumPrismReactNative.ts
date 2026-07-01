import { TurboModuleRegistry, type TurboModule } from "react-native";

export interface Spec extends TurboModule {
  getSdkVersion(): Promise<string>;
  echoJsonValue(input: string): Promise<string>;
  create(
    account: string,
    profile: string,
    environment: string,
    logLevel: string | null
  ): string;
  track(
    instanceId: string,
    name: string,
    type: string,
    dataJson: string | null
  ): Promise<string>;
  shutdown(instanceId: string): Promise<void>;
}

// Use the non-throwing getter so JS-only environments (web fallback, Jest)
// can import this module without a registered native binding.
export default TurboModuleRegistry.get<Spec>("TealiumPrismReactNative");
