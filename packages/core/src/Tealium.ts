import NativeTealiumPrismReactNative from "./NativeTealiumPrismReactNative";
import { serialize } from "./serialization";
import type {
  DispatchType,
  JsonValueObject,
  LogLevel,
  TrackResult,
} from "./types";
import { ErrorCode } from "./ErrorCode";
import { tealiumError } from "./errors";

const instances = new Map<string, Tealium>();

export class Tealium {
  readonly instanceId: string;
  private _isShutdown = false;

  private constructor(instanceId: string) {
    this.instanceId = instanceId;
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
   * Parses a {@link TrackResult} JSON string returned by a native method,
   * throwing a {@link ErrorCode.DATA_PARSE_ERROR} tagged with {@link context}
   * if it is not valid JSON.
   */
  private parseTrackResult(resultJson: string, context: string): TrackResult {
    try {
      return JSON.parse(resultJson) as TrackResult;
    } catch {
      throw tealiumError(ErrorCode.DATA_PARSE_ERROR, context, resultJson);
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
        .then((resultJson) =>
          this.parseTrackResult(resultJson, "Tealium.track")
        )
    );
  }

  /**
   * Joins a trace for the given id. The trace id is added to every subsequent
   * dispatch until {@link leaveTrace} is called or the session expires.
   */
  joinTrace(id: string): Promise<void> {
    return this.withNative((native) => native.joinTrace(this.instanceId, id));
  }

  /** Leaves the current trace, if one has been joined. */
  leaveTrace(): Promise<void> {
    return this.withNative((native) => native.leaveTrace(this.instanceId));
  }

  /**
   * Forces the end of the current visit. Dispatches a kill-session event and
   * resolves with its {@link TrackResult}. Rejects if no trace is joined.
   */
  forceEndOfVisit(): Promise<TrackResult> {
    return this.withNative((native) =>
      native
        .forceEndOfVisit(this.instanceId)
        .then((resultJson) =>
          this.parseTrackResult(resultJson, "Tealium.forceEndOfVisit")
        )
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
