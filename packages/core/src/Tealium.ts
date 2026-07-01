import NativeTealiumPrismReactNative from "./NativeTealiumPrismReactNative";
import { serialize } from "./serialization";
import type { DispatchType, JsonValueObject, TrackResult } from "./types";

const instances = new Map<string, Tealium>();

export class Tealium {
  readonly instanceId: string;
  private _isShutdown = false;

  private constructor(instanceId: string) {
    this.instanceId = instanceId;
  }

  static create(
    account: string,
    profile: string,
    environment: "dev" | "qa" | "prod",
    logLevel?: string
  ): Tealium {
    if (!NativeTealiumPrismReactNative) {
      throw new Error(
        "TealiumPrismReactNative native module is not registered."
      );
    }

    const key = `${account}-${profile}`;

    const cached = instances.get(key);
    if (cached && !cached._isShutdown) {
      return cached;
    }

    const instanceId = NativeTealiumPrismReactNative.create(
      account,
      profile,
      environment,
      logLevel ?? null
    );

    const instance = new Tealium(instanceId);
    instances.set(key, instance);
    return instance;
  }

  track(
    name: string,
    type: DispatchType = "event",
    data?: JsonValueObject
  ): Promise<TrackResult> {
    if (this._isShutdown) {
      return Promise.reject(
        new Error(`Tealium instance "${this.instanceId}" has been shut down.`)
      );
    }
    if (!NativeTealiumPrismReactNative) {
      return Promise.reject(
        new Error("TealiumPrismReactNative native module is not registered.")
      );
    }

    const dataJson = data !== undefined ? serialize(data) : null;

    return NativeTealiumPrismReactNative.track(
      this.instanceId,
      name,
      type,
      dataJson
    ).then((resultJson) => JSON.parse(resultJson) as TrackResult);
  }

  shutdown(): Promise<void> {
    if (this._isShutdown) {
      return Promise.resolve();
    }
    if (!NativeTealiumPrismReactNative) {
      return Promise.reject(
        new Error("TealiumPrismReactNative native module is not registered.")
      );
    }

    this._isShutdown = true;
    instances.delete(this.instanceId);

    return NativeTealiumPrismReactNative.shutdown(this.instanceId);
  }
}
