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

/**
 * A Tealium Prism instance for one account and profile.
 *
 * Get an instance with {@link Tealium.create}. The constructor is private.
 * Every instance method that talks to the native SDK returns a Promise.
 * {@link Tealium.create} is synchronous. After {@link Tealium.shutdown}, those
 * Promises reject with {@link ErrorCode.INSTANCE_SHUT_DOWN}, except that
 * calling {@link Tealium.shutdown} again resolves.
 *
 * @example
 * ```ts
 * const tealium = Tealium.create("my_account", "my_profile", Environment.prod);
 * await tealium.track("homepage", "view");
 * ```
 */
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
   * Creates a Tealium instance for an account and profile, or returns the
   * existing one.
   *
   * If an instance already exists for the same account and profile, this
   * method logs a warning and returns it. It ignores `environment`,
   * `settingsFile`, `settingsUrl`, and `logLevel` in that case.
   *
   * The optional arguments mirror the settings sources of the native
   * `TealiumConfig`. An omitted argument leaves that source unconfigured. The
   * settings precedence is `local < remote < programmatic` on both platforms.
   * A key in `settingsUrl` (remote) overrides the same key in `settingsFile`
   * (local). `logLevel` (programmatic) overrides both.
   *
   * @param account - Tealium account name.
   * @param profile - Tealium profile name.
   * @param environment - Environment name, such as `dev`, `qa`, or `prod`. See
   *   {@link Environment}.
   * @param settingsFile - Name of a JSON settings file bundled with the app.
   *   It provides the local settings, which have the lowest priority. On iOS
   *   this is a resource name in the main bundle, and the `.json` extension is
   *   optional. On Android this is a file name in the `assets/` directory. The
   *   native SDK skips local settings silently if the file is missing or
   *   invalid.
   * @param settingsUrl - Full URL of a remote JSON settings resource. The
   *   native SDK fetches and caches these remote settings, which have middle
   *   priority, and refreshes them at the configured interval. Without a URL,
   *   the SDK fetches no remote settings.
   * @param logLevel - Log verbosity of the native Prism SDK. See
   *   {@link LogLevel}.
   * @returns The Tealium instance. Native initialization continues
   *   asynchronously, so a native failure does not make this method throw.
   *   Later calls on the instance reject instead.
   * @throws {@link TealiumError} with code
   *   {@link ErrorCode.NATIVE_MODULE_NOT_REGISTERED} if the native module is
   *   missing. The error is thrown synchronously.
   *
   * @example
   * ```ts
   * const tealium = Tealium.create(
   *   "my_account",
   *   "my_profile",
   *   Environment.prod,
   *   "my_settings.json",
   *   "https://tags.tiqcdn.com/dle/my_account/my_profile/mobile_settings_prod.json"
   * );
   * ```
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

  /**
   * Tracks an event or a view.
   *
   * The Promise rejects with a {@link TealiumError} if the instance is shut
   * down or the native SDK reports a failure.
   *
   * @param name - Name of the event or view.
   * @param type - Dispatch type. Defaults to `"event"`.
   * @param data - Data to attach to the dispatch. TypeScript rejects values
   *   that are not JSON types. At runtime, `track` serializes `data` with
   *   `JSON.stringify`, so it silently omits object properties whose values
   *   are functions, symbols, or `undefined`.
   * @returns A Promise that resolves with the {@link TrackResult}. The result
   *   reports whether the SDK accepted or dropped the dispatch.
   * @throws `Error` if `data` cannot be serialized, for example if it
   *   contains a `BigInt` or a circular reference. The error is thrown
   *   synchronously instead of rejecting the Promise. It has no `code`
   *   property.
   *
   * @example
   * ```ts
   * const result = await tealium.track("user_login", "event", {
   *   customer_id: "1234567890",
   * });
   * console.log(result.status);
   * ```
   */
  track(
    name: string,
    type: DispatchType = "event",
    data?: JsonValueObject
  ): Promise<TrackResult> {
    // serialize runs inside withNative so a serialization throw becomes a rejection.
    return this.withNative((native) => {
      const dataJson = data !== undefined ? serialize(data) : null;
      return native
        .track(this.instanceId, name, type, dataJson)
        .then((resultJson) => parseTrackResult(resultJson, "Tealium.track"));
    });
  }

  /**
   * Shuts down the native instance.
   *
   * Calling this method again on a shut-down instance resolves immediately.
   * After shutdown, calls on this instance reject with
   * {@link ErrorCode.INSTANCE_SHUT_DOWN}. Call {@link Tealium.create} again to
   * get a new instance for the same account and profile.
   *
   * @returns A Promise that resolves after the native SDK receives the shutdown
   *   request. It rejects with {@link ErrorCode.NATIVE_MODULE_NOT_REGISTERED} if the native
   *   module is missing.
   */
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
