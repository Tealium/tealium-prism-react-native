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
import { DataLayer } from "./modules/DataLayer";
import type { ModuleProxy, NativeModule } from "./modules/ModuleProxy";

const instances = new Map<string, Tealium>();

export class Tealium {
  /**
   * Stable id addressing this instance in every native call. Equal to the
   * SDK's `TealiumConfig.key`, the string `"{account}-{profile}"`, so it also
   * matches the key this class caches instances under (see {@link create}).
   */
  readonly instanceId: string;
  /** Trace controls, namespaced to mirror the native Prism `Trace` module. */
  readonly trace: Trace;
  /** DataLayer facade, mirroring the native Prism `DataLayer` module. */
  readonly dataLayer: DataLayer;
  private _isShutdown = false;

  private constructor(instanceId: string) {
    this.instanceId = instanceId;
    this.trace = new Trace(this.createModuleProxy());
    this.dataLayer = new DataLayer(this.createModuleProxy());
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

  /**
   * Creates (or reuses) a Tealium instance for the given account/profile.
   *
   * The optional settings arguments mirror the sources on the native
   * `TealiumConfig`; an omitted argument leaves that source unconfigured on the
   * native SDK. Settings precedence on both platforms is
   * `local < remote < programmatic`, so a key in `settingsUrl` (remote)
   * overrides the same key in `settingsFile` (local), and `logLevel`
   * (programmatic) overrides both.
   *
   * @param account Tealium account identifier.
   * @param profile Tealium profile identifier.
   * @param environment Environment name (e.g. `dev`, `qa`, `prod`).
   * @param settingsFile Name of a JSON settings file bundled with the app,
   *   providing local (lowest-priority) settings. On iOS this is a resource
   *   name in the app's main bundle (the `.json` extension is optional); on
   *   Android it is a file name in the `assets/` directory. If the file is
   *   missing or invalid, the native SDK skips local settings silently.
   * @param settingsUrl Full URL of a remote JSON settings resource. When set,
   *   the native SDK fetches and caches remote (middle-priority) settings and
   *   refreshes them per the configured interval. When omitted, no remote
   *   settings are fetched.
   * @param logLevel Log verbosity for the native Prism SDK.
   */
  static create(
    account: string,
    profile: string,
    environment: string,
    settingsFile?: string,
    settingsUrl?: string,
    logLevel?: LogLevel
  ): Tealium {
    if (!NativeTealiumPrismReactNative) {
      throw tealiumError(ErrorCode.NATIVE_MODULE_NOT_REGISTERED);
    }

    // Mirrors the SDK's `TealiumConfig.key`, so this is exactly the id
    // `native.create` returns (see the spec's `create` doc). Caching under it
    // lets `shutdown` remove the entry by `instanceId` and matches the SDK's
    // own dedupe of duplicate account/profile pairs.
    const key = `${account}-${profile}`;

    const cached = instances.get(key);
    if (cached && !cached._isShutdown) {
      console.warn(
        `[Tealium] Duplicate Tealium instance requested for ${key}. Returning existing instance. Note: environment, settingsFile, settingsUrl, and logLevel from this call are ignored.`
      );
      return cached;
    }

    const instanceId = NativeTealiumPrismReactNative.create(
      account,
      profile,
      environment,
      settingsFile ?? null,
      settingsUrl ?? null,
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

    // Native resolves with no payload (nil on iOS, null on Android); normalize
    // to undefined so the result is identical on both platforms.
    return NativeTealiumPrismReactNative.shutdown(this.instanceId).then(
      () => undefined
    );
  }
}
