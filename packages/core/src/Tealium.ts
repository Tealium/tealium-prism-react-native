import NativeTealiumPrismReactNative from "./NativeTealiumPrismReactNative";
import { parseTrackResult, serialize } from "./serialization";
import type {
  DispatchType,
  JsonValueObject,
  LogLevel,
  TrackResult,
} from "./types";
import { ErrorCode } from "./ErrorCode";
import { tealiumError } from "./errors";
import { Trace } from "./modules/Trace";
import type { ModuleProxy, NativeModule } from "./modules/ModuleProxy";

const instances = new Map<string, Tealium>();

export class Tealium {
  readonly instanceId: string;
  /** Trace controls, namespaced to mirror the native Prism `Trace` module. */
  readonly trace: Trace;
  private _isShutdown = false;

  private constructor(instanceId: string) {
    this.instanceId = instanceId;
    this.trace = new Trace(this.createModuleProxy());
  }

  /**
   * Builds the {@link ModuleProxy} handed to each sub-module. The `withNative`
   * arrow closes over `this`, so {@link getNativeModule} reads the live
   * `_isShutdown` at call time — a module call after {@link shutdown} still
   * rejects with `INSTANCE_SHUT_DOWN`. Shutdown state stays owned solely by
   * this class; the proxy never snapshots it.
   */
  private createModuleProxy(): ModuleProxy {
    return {
      instanceId: this.instanceId,
      withNative: <T>(
        action: (native: NativeModule) => Promise<T>
      ): Promise<T> => this.withNative(action),
    };
  }

  /**
   * Returns the native module, throwing if this instance was shut down or the
   * module failed to register. Callers should use {@link withNative} so the
   * throw is converted to a rejected Promise.
   */
  private getNativeModule(): NonNullable<typeof NativeTealiumPrismReactNative> {
    if (this._isShutdown) {
      throw tealiumError(ErrorCode.INSTANCE_SHUT_DOWN, this.instanceId);
    }
    if (!NativeTealiumPrismReactNative) {
      throw tealiumError(ErrorCode.NATIVE_MODULE_NOT_REGISTERED);
    }
    return NativeTealiumPrismReactNative;
  }

  /**
   * Runs an action against the native module, so each method only handles the
   * happy path. The synchronous throw from {@link getNativeModule} is turned
   * into a rejected Promise; a Promise the action returns passes through as-is.
   */
  private withNative<T>(
    action: (
      native: NonNullable<typeof NativeTealiumPrismReactNative>
    ) => Promise<T>
  ): Promise<T> {
    try {
      return action(this.getNativeModule());
    } catch (error) {
      return Promise.reject(error);
    }
  }

  static create(
    account: string,
    profile: string,
    environment: string,
    logLevel?: LogLevel
  ): Tealium {
    if (!NativeTealiumPrismReactNative) {
      throw tealiumError(ErrorCode.NATIVE_MODULE_NOT_REGISTERED);
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
    const dataJson = data !== undefined ? serialize(data) : null;

    return this.withNative((native) =>
      native
        .track(this.instanceId, name, type, dataJson)
        .then((resultJson) => parseTrackResult(resultJson, "Tealium.track"))
    );
  }

  shutdown(): Promise<void> {
    if (this._isShutdown) {
      return Promise.resolve();
    }
    if (!NativeTealiumPrismReactNative) {
      return Promise.reject(
        tealiumError(ErrorCode.NATIVE_MODULE_NOT_REGISTERED)
      );
    }

    this._isShutdown = true;
    instances.delete(this.instanceId);

    return NativeTealiumPrismReactNative.shutdown(this.instanceId);
  }
}
