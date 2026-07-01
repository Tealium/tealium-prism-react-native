import NativeTealiumPrismReactNative from "./NativeTealiumPrismReactNative";
import { serialize } from "./serialization";
import type { DispatchType, JsonValueObject, TrackResult } from "./types";
import { NATIVE_MODULE_NOT_REGISTERED_ERROR } from "./constants";

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
      throw new Error(NATIVE_MODULE_NOT_REGISTERED_ERROR);
    }

    const key = `${account}-${profile}`;

    const cached = instances.get(key);
    if (cached && !cached._isShutdown) {
      console.warn(
        `[Tealium] Duplicate Tealium instance requested for ${key}. Returning existing instance. Note: environment and logLevel from this call are ignored.`
      );
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
      return Promise.reject(new Error(NATIVE_MODULE_NOT_REGISTERED_ERROR));
    }

    const dataJson = data !== undefined ? serialize(data) : null;

    return NativeTealiumPrismReactNative.track(
      this.instanceId,
      name,
      type,
      dataJson
    ).then((resultJson) => {
      try {
        return JSON.parse(resultJson) as TrackResult;
      } catch {
        throw new Error(
          `Tealium.track: native returned non-JSON string: ${resultJson}`
        );
      }
    });
  }

  shutdown(): Promise<void> {
    if (this._isShutdown) {
      return Promise.resolve();
    }
    if (!NativeTealiumPrismReactNative) {
      return Promise.reject(new Error(NATIVE_MODULE_NOT_REGISTERED_ERROR));
    }

    this._isShutdown = true;
    instances.delete(this.instanceId);

    return NativeTealiumPrismReactNative.shutdown(this.instanceId);
  }
}
