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
    /// `leaveTrace` is called or the session expires. Trace.join emits `Void`; the promise
    /// completes with no value.
    @objc public static func joinTrace(
        instanceId: String,
        id: String,
        completion: @escaping (PromiseRejection?) -> Void
    ) {
        TealiumInstanceManager.shared.withInstance(instanceId, completion: completion) { instance in
            instance.trace.join(id: id).subscribeVoid(completion)
        }
    }

    /// Leaves the current trace on the instance. A no-op natively if no trace is joined. Trace.leave
    /// emits `Void`; the promise completes with no value.
    @objc public static func leaveTrace(
        instanceId: String,
        completion: @escaping (PromiseRejection?) -> Void
    ) {
        TealiumInstanceManager.shared.withInstance(instanceId, completion: completion) { instance in
            instance.trace.leave().subscribeVoid(completion)
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

    // MARK: - DataLayer

    // TODO: update native call when API changed in SDK
    /// Stores every key/value pair of the JSON object `dataJson` in the data layer.
    ///
    /// `expiryEncoded` carries the JS-encoded expiry policy; `nil`, or a value the SDK's converter
    /// cannot decode, selects the SDK's no-expiry overload, which stores forever. The Prism SDK's
    /// [`DataLayer.put(data:)`](doc:DataLayer/put(data:)) (still named `put`, not `putAll`) emits
    /// `Void`; the promise completes with no value.
    @objc public static func dataLayerPutAll(
        instanceId: String,
        dataJson: String,
        expiryEncoded: NSNumber?,
        completion: @escaping (PromiseRejection?) -> Void
    ) {
        TealiumInstanceManager.shared.withInstance(instanceId, completion: completion) { instance in
            let data: DataObject
            do {
                data = try DataObject(jsonString: dataJson)
            } catch {
                completion(PromiseRejection(
                    code: .dataParseError,
                    error: error
                ))
                return
            }

            let pendingPut: SingleResult<Void, ModuleError<Error>>
            if let expiry = DataLayerConversions.expiry(fromEncoded: expiryEncoded) {
                pendingPut = instance.dataLayer.put(data: data, expiry: expiry)
            } else {
                pendingPut = instance.dataLayer.put(data: data)
            }
            pendingPut.subscribeVoid(completion)
        }
    }

    /// Stores the single JSON value `valueJson` under `key`.
    ///
    /// `expiryEncoded` uses the same encoding as
    /// [`TealiumPrismBridge.dataLayerPutAll(instanceId:dataJson:expiryEncoded:completion:)`](doc:TealiumPrismBridge/dataLayerPutAll(instanceId:dataJson:expiryEncoded:completion:)).
    /// The parsed `DataItem` is handed to the SDK's `put(key:converting:)` overloads, since
    /// `DataItem` is `DataInputConvertible`.
    @objc public static func dataLayerPutValue(
        instanceId: String,
        key: String,
        valueJson: String,
        expiryEncoded: NSNumber?,
        completion: @escaping (PromiseRejection?) -> Void
    ) {
        TealiumInstanceManager.shared.withInstance(instanceId, completion: completion) { instance in
            let value: DataItem
            do {
                value = try JsonValueConversions.dataItem(fromJSONString: valueJson)
            } catch {
                completion(PromiseRejection(
                    code: .dataParseError,
                    error: error
                ))
                return
            }

            let pendingPut: SingleResult<Void, ModuleError<Error>>
            if let expiry = DataLayerConversions.expiry(fromEncoded: expiryEncoded) {
                pendingPut = instance.dataLayer.put(key: key, converting: value, expiry: expiry)
            } else {
                pendingPut = instance.dataLayer.put(key: key, converting: value)
            }
            pendingPut.subscribeVoid(completion)
        }
    }

    /// Reads the value stored under `key`.
    ///
    /// The SDK returns `nil` only for an absent key, so the nullable converter completes with a
    /// `nil` result — a JS `null` — while a stored JSON `null` completes with the string `"null"`.
    @objc public static func dataLayerGet(
        instanceId: String,
        key: String,
        completion: @escaping (String?, PromiseRejection?) -> Void
    ) {
        TealiumInstanceManager.shared.withInstance(instanceId, completion: completion) { instance in
            instance.dataLayer.getDataItem(key: key).subscribe(completion) { $0 }
        }
    }

    /// Reads every stored key/value pair, completing with the whole `DataObject` as one JSON object.
    @objc public static func dataLayerGetAll(
        instanceId: String,
        completion: @escaping (String?, PromiseRejection?) -> Void
    ) {
        TealiumInstanceManager.shared.withInstance(instanceId, completion: completion) { instance in
            instance.dataLayer.getAll().subscribe(completion) { DataItem(converting: $0) }
        }
    }

    /// Removes every key in `keys`.
    ///
    /// `keys` arrives as `[Any]` because it crosses the TurboModule bridge as an untyped
    /// `NSArray`; JS callers that bypass the TS types could pass non-string elements, so the
    /// cast to `[String]` is validated here rather than force-cast.
    ///
    /// `remove` emits `Void`; the promise completes with no value.
    @objc public static func dataLayerRemove(
        instanceId: String,
        keys: [Any],
        completion: @escaping (PromiseRejection?) -> Void
    ) {
        TealiumInstanceManager.shared.withInstance(instanceId, completion: completion) { instance in
            guard let keys = keys as? [String] else {
                completion(PromiseRejection(
                    code: .dataParseError,
                    message: "Expected keys to be an array of strings"
                ))
                return
            }
            instance.dataLayer.remove(keys: keys).subscribeVoid(completion)
        }
    }

    /// Clears the whole data layer. `clear` emits `Void`; the promise completes with no value.
    @objc public static func dataLayerClear(
        instanceId: String,
        completion: @escaping (PromiseRejection?) -> Void
    ) {
        TealiumInstanceManager.shared.withInstance(instanceId, completion: completion) { instance in
            instance.dataLayer.clear().subscribeVoid(completion)
        }
    }

    @objc public static func shutdown(
        instanceId: String,
        completion: @escaping () -> Void
    ) {
        TealiumInstanceManager.shared.shutdown(instanceId)
        completion()
    }
}
