import Foundation
import TealiumPrism

@objc(TealiumPrismBridge)
public final class TealiumPrismBridge: NSObject {

    /// Converts a JSON string inbound through the Prism SDK's DataItem
    /// representation and back out as a JSON string, exercising the full
    /// conversion path without any side effects.
    ///
    /// Accepts a JSON string rather than a native type so that JS `null`
    /// values survive the TurboModule bridge: `JSONSerialization` maps JSON
    /// null to `NSNull`, whereas the TurboModule bridge drops nil-valued keys
    /// from plain objects before the method body runs.
    @objc public static func echoJsonValue(
        _ jsonString: String,
        completion: @escaping (String?, PromiseRejection?) -> Void
    ) {
        do {
            let dataItem = try JsonValueConversions.dataItem(fromJSONString: jsonString)
            completion(try JsonValueConversions.jsonString(from: dataItem), nil)
        } catch {
            completion(nil, PromiseRejection(
                code: .prismNativeError,
                error: error
            ))
        }
    }

    @objc public static func createInstance(
        account: String,
        profile: String,
        environment: String,
        logLevel: String?,
        settingsFile: String?,
        settingsUrl: String?
    ) -> String {
        let forcingSettingsBlock: ((CoreSettingsBuilder) -> CoreSettingsBuilder)? = logLevel.flatMap { level in
            LogLevel.Minimum(from: level).map { minLevel in
                { builder in builder.setMinLogLevel(minLevel) }
            }
        }

        // Enable the Trace module with default (non-nil) enforced settings. The registry's default
        // registration uses the nil variant, which only instantiates Trace when local/remote
        // settings exist; passing it here makes the module available so the RN-driven join/leave/
        // forceEndOfVisit calls work out of the box. Trace stays inert until join() is called.
        //
        // TODO(next PR): This force-adds Trace for every consumer, unlike the native SDKs where the
        //   app developer opts in via config modules or settings JSON (see the Kotlin/Swift example
        //   apps). Once the wrapper exposes a JS config surface (module registration + per-module
        //   settings such as Trace.setTrackErrors, and settingsFile/settingsUrl), remove this
        //   hardcoded module and let the consumer enable/configure Trace themselves.
        let config = TealiumConfig(
            account: account,
            profile: profile,
            environment: environment,
            modules: [Modules.trace()],
            settingsFile: settingsFile,
            settingsUrl: settingsUrl,
            forcingSettings: forcingSettingsBlock
        )

        // The SDK reuses the existing instance (and logs a warning) for a duplicate key.
        let instance = Tealium.create(config: config)
        instance.strongCapture = instance
        return config.key
    }

    @objc public static func track(
        instanceId: String,
        name: String,
        type: String,
        dataJson: String?,
        completion: @escaping (String?, PromiseRejection?) -> Void
    ) {
        TealiumInstanceManager.shared.withInstance(instanceId, completion: completion) { instance in
            let dispatchType: DispatchType = (type == "view") ? .view : .event

            do {
                let data = try dataJson.map { try DataObject(jsonString: $0) } ?? [:]
                instance.track(name, type: dispatchType, data: data)
                    .subscribe(completion, converter: trackResultAsDataItem)
            } catch {
                completion(nil, PromiseRejection(
                    code: .dataParseError,
                    error: error
                ))
                return
            }
        }
    }

    /// Joins the trace `id` on the instance, adding the id to every subsequent dispatch until
    /// `leaveTrace` is called or the session expires. Trace.join emits `Void`; the payload-less
    /// result is converted to `DataItem.null` so the promise completes with a JSON `null`.
    @objc public static func joinTrace(
        instanceId: String,
        id: String,
        completion: @escaping (String?, PromiseRejection?) -> Void
    ) {
        TealiumInstanceManager.shared.withInstance(instanceId, completion: completion) { instance in
            instance.trace.join(id: id).subscribe(completion) { _ in DataItem.null }
        }
    }

    /// Leaves the current trace on the instance. A no-op natively if no trace is joined. Trace.leave
    /// emits `Void`; the payload-less result is converted to `DataItem.null` so the promise
    /// completes with a JSON `null`.
    @objc public static func leaveTrace(
        instanceId: String,
        completion: @escaping (String?, PromiseRejection?) -> Void
    ) {
        TealiumInstanceManager.shared.withInstance(instanceId, completion: completion) { instance in
            instance.trace.leave().subscribe(completion) { _ in DataItem.null }
        }
    }

    /// Forces the end of the current visit, dispatching a kill-session event. Completes with the
    /// JSON `TrackResult` of that dispatch (via `trackResultAsDataItem`) and fails natively when
    /// no trace is joined.
    @objc public static func forceEndOfVisit(
        instanceId: String,
        completion: @escaping (String?, PromiseRejection?) -> Void
    ) {
        TealiumInstanceManager.shared.withInstance(instanceId, completion: completion) { instance in
            instance.trace.forceEndOfVisit().subscribe(completion, converter: trackResultAsDataItem)
        }
    }

    /// Converts a `TrackResult` into the JSON-serializable `DataItem` shape shared with `track`:
    /// `status` (accepted/dropped), `info`, and the dispatch `payload`.
    private static func trackResultAsDataItem(_ result: TrackResult) -> DataItem {
        let payload: DataObject = [
            "status": result.status == .accepted ? "accepted" : "dropped",
            "info": result.info,
            "payload": result.dispatch.payload
        ]
        return DataItem(converting: payload)
    }

    @objc public static func shutdown(
        instanceId: String,
        completion: @escaping () -> Void
    ) {
        TealiumInstanceManager.shared.get(instanceId) { instance in
            // Dropping the last strong reference triggers deinit, which shuts the instance down.
            instance?.strongCapture = nil
            completion()
        }
    }
}
