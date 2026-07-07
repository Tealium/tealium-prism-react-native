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
    @objc public static func echoJsonValueFromJSON(
        _ jsonString: String,
        error: NSErrorPointer
    ) -> String? {
        do {
            let dataItem = try JsonValueConversions.dataItem(fromJSONString: jsonString)
            return try JsonValueConversions.jsonString(from: dataItem)
        } catch let e as NSError {
            error?.pointee = e
            return nil
        }
    }

    @objc public static func createInstance(
        account: String,
        profile: String,
        environment: String,
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
        completion: @escaping (String?, NSError?) -> Void
    ) {
        TealiumInstanceManager.shared.withInstance(instanceId, completion: completion) { instance in
            let dispatchType: DispatchType = (type == "view") ? .view : .event

            let data: DataObject?
            do {
                data = try dataJson.map { try DataObject(jsonString: $0) }
            } catch {
                let nsError = NSError(
                    domain: "DATA_PARSE_ERROR",
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Failed to parse data JSON: \(error.localizedDescription)"]
                )
                completion(nil, nsError)
                return
            }

            instance.track(name, type: dispatchType, data: data)
                .subscribe(completion, converter: trackResultAsDataItem)
        }
    }

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
