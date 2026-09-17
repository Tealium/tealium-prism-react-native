import {
  TurboModuleRegistry,
  type TurboModule,
  type CodegenTypes,
} from "react-native";

/**
 * Payload for every subscription-backed emitter. Native echoes back the
 * `subscriptionId` JS minted — so a multiplexed emitter fans out to exactly one
 * listener — alongside the still-serialized `DataObject` JSON, parsed in JS.
 */
export type SubscriptionEmission = {
  subscriptionId: string;
  payloadJson: string;
};

export interface Spec extends TurboModule {
  getSdkVersion(): Promise<string>;
  echoJsonValue(input: string): Promise<string>;
  /**
   * Creates (or reuses) the native Tealium instance and returns its id. The id
   * is the SDK's `TealiumConfig.key` on both platforms — the string
   * `"{account}-{profile}"` (e.g. account `"tealium"` + profile `"main"` →
   * `"tealium-main"`) — so it is stable for a given account/profile pair rather
   * than an opaque per-call token. It is the handle every other method passes
   * back to native to address one instance. The SDK reuses (and logs a warning
   * for) an existing instance when a duplicate key is created.
   */
  create(
    account: string,
    profile: string,
    environment: string,
    settingsFile: string | null,
    settingsUrl: string | null,
    logLevel: string | null
  ): string;
  track(
    instanceId: string,
    name: string,
    type: string,
    dataJson: string | null
  ): Promise<string>;
  shutdown(instanceId: string): Promise<void>;
  joinTrace(instanceId: string, id: string): Promise<void>;
  leaveTrace(instanceId: string): Promise<void>;
  forceEndOfVisit(instanceId: string): Promise<string>;

  // DataLayer subscriptions. JS mints the opaque `subscriptionId` (see
  // subscriptionRouter), native tags the SDK subscription with it and echoes it
  // back on every emitted event so JS routes each event to exactly one
  // listener. Resolves once the SDK subscription is registered; rejects with
  // `INSTANCE_NOT_FOUND` when no native instance exists for `instanceId`, so a
  // failed registration is reported to JS instead of being swallowed natively.
  dataLayerSubscribeUpdated(
    instanceId: string,
    subscriptionId: string
  ): Promise<void>;
  // Tears down the SDK subscription tagged with `subscriptionId`. Keyed only by
  // `subscriptionId` — no `instanceId` or stream discriminator — because the id
  // is globally unique and native already tracks its subscription→instance
  // mapping, so the id alone locates exactly one SDK subscription. This single
  // method therefore tears down EVERY stream type, present and future: each new
  // stream (e.g. `onModuleEvent`) adds its own `…Subscribe…` method (e.g.
  // `moduleSubscribeEvent`) but reuses this one teardown.
  disposeSubscription(subscriptionId: string): void;

  // Single module-level emitter multiplexing every instance and listener.
  readonly onDataUpdated: CodegenTypes.EventEmitter<SubscriptionEmission>;
}

// Use the non-throwing getter so JS-only environments (web fallback, Jest)
// can import this module without a registered native binding.
export default TurboModuleRegistry.get<Spec>("TealiumPrismReactNative");
