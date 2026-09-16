import Foundation
import TealiumPrism

@objc(TealiumPrismBridge)
public final class TealiumPrismBridge: NSObject {

    /// Lifecycle tracker for DataLayer subscriptions. Thread-safe because the SDK
    /// delivers `register`/event callbacks on arbitrary Tealium queues while JS
    /// `unsubscribe`/`shutdown` calls arrive on their own thread.
    private static let subscriptions = SubscriptionStore()

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
        settingsFile: String?,
        settingsUrl: String?,
        logLevel: String?
    ) -> String {
        let forcingSettingsBlock: ((CoreSettingsBuilder) -> CoreSettingsBuilder)? = logLevel.flatMap { level in
            LogLevel.Minimum(from: level).map { minLevel in
                { builder in builder.setMinLogLevel(minLevel) }
            }
        }

        let config = TealiumConfig(
            account: account,
            profile: profile,
            environment: environment,
            settingsFile: settingsFile,
            settingsUrl: settingsUrl,
            forcingSettings: forcingSettingsBlock
        )

        // The SDK reuses the existing instance (and logs a warning) for a duplicate key.
        // TealiumInstanceManager retains the instance until it is shut down, so we hold
        // no reference of our own.
        _ = Tealium.create(config: config)
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

    /// Subscribes to the instance's `onDataUpdated` stream, tagging each emitted
    /// delta with `subscriptionId` so JS routes it to a single listener. The
    /// registration is async: `markPending` records intent, and once the SDK
    /// hands back a `Disposable` it is stored via `SubscriptionStore.register`
    /// (or disposed immediately if the subscription was torn down while
    /// registering). The stream's completion is wired to `teardown` so an
    /// upstream `onComplete` releases the entry without leaking.
    ///
    /// `emit` forwards each event to the module's generated `emitOnDataUpdated:`.
    @objc public static func dataLayerSubscribeUpdated(
        instanceId: String,
        subscriptionId: String,
        emit: @escaping ([String: Any]) -> Void
    ) {
        subscriptions.markPending(subscriptionId: subscriptionId, instanceId: instanceId)
        TealiumInstanceManager.shared.get(instanceId) { instance in
            guard let instance else {
                subscriptions.cancelPending(subscriptionId: subscriptionId, instanceId: instanceId)
                return
            }
            let disposable = instance.dataLayer.onDataUpdated.subscribe(
                { dataObject in
                    // DataObject.serialize() is the SDK's public JSON serialization.
                    guard let payloadJson = try? dataObject.serialize() else { return }
                    emit([
                        "subscriptionId": subscriptionId,
                        "payloadJson": payloadJson
                    ])
                },
                onComplete: {
                    subscriptions.teardown(subscriptionId: subscriptionId)
                }
            )
            subscriptions.register(
                subscriptionId: subscriptionId,
                instanceId: instanceId,
                disposable: disposable
            )
        }
    }

    /// Tears down the subscription for `subscriptionId`; a no-op if unknown.
    @objc public static func disposeSubscription(subscriptionId: String) {
        subscriptions.teardown(subscriptionId: subscriptionId)
    }

    @objc public static func shutdown(
        instanceId: String,
        completion: @escaping () -> Void
    ) {
        // Dispose tracked subscriptions up front so their teardown is deterministic
        // rather than racing the SDK's asynchronous shutdown `onComplete`, then hand
        // the instance to the SDK's own lifecycle manager to shut it down.
        subscriptions.disposeAll(for: instanceId)
        TealiumInstanceManager.shared.shutdown(instanceId)
        completion()
    }

    /// Disposes every tracked DataLayer subscription across all instances. Called from
    /// `TealiumPrismReactNative.invalidate()` when RN tears down the JS runtime (dev full
    /// reload, or a brownfield host recreating the React instance), so native subscriptions
    /// don't outlive the JS listeners that would have received their events.
    @objc public static func invalidate() {
        subscriptions.disposeAll()
    }
}
