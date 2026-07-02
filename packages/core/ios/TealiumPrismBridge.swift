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
        TealiumPrismInstanceRegistry.shared.create(
            account: account,
            profile: profile,
            environment: environment,
            logLevel: logLevel
        )
    }

    @objc public static func track(
        instanceId: String,
        name: String,
        type: String,
        dataJson: String?,
        completion: @escaping (String?, NSError?) -> Void
    ) {
        guard let instance = TealiumPrismInstanceRegistry.shared.getTealiumInstance(instanceId),
              let disposables = TealiumPrismInstanceRegistry.shared.getDisposables(instanceId) else {
            let error = NSError(
                domain: "INSTANCE_NOT_FOUND",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "No Tealium instance with key '\(instanceId)'"]
            )
            completion(nil, error)
            return
        }

        let dispatchType: DispatchType = (type == "view") ? .view : .event

        let data: DataObject?
        if let jsonString = dataJson {
            do {
                guard let jsonData = jsonString.data(using: .utf8) else {
                    let error = NSError(
                        domain: "DATA_PARSE_ERROR",
                        code: 1,
                        userInfo: [NSLocalizedDescriptionKey: "Data JSON string is not valid UTF-8"]
                    )
                    completion(nil, error)
                    return
                }
                let jsonObject = try JSONSerialization.jsonObject(with: jsonData, options: .fragmentsAllowed)
                guard let dictionary = jsonObject as? [String: Any] else {
                    let error = NSError(
                        domain: "DATA_PARSE_ERROR",
                        code: 1,
                        userInfo: [NSLocalizedDescriptionKey: "Data JSON is not a dictionary"]
                    )
                    completion(nil, error)
                    return
                }
                data = try DataObject(jsonObject: dictionary)
            } catch {
                let nsError = NSError(
                    domain: "DATA_PARSE_ERROR",
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Failed to parse data JSON: \(error.localizedDescription)"]
                )
                completion(nil, nsError)
                return
            }
        } else {
            data = nil
        }

        instance.track(name, type: dispatchType, data: data)
            .subscribe { result in
                switch result {
                case .success(let trackResult):
                    let status: String = (trackResult.status == .accepted) ? "accepted" : "dropped"
                    let resultDict: [String: Any] = [
                        "status": status,
                        "info": trackResult.info,
                        "payload": trackResult.dispatch.payload.asDictionary()
                    ]
                    guard let jsonData = try? JSONSerialization.data(withJSONObject: resultDict),
                          let jsonString = String(data: jsonData, encoding: .utf8) else {
                        completion(nil, NSError(
                            domain: "SERIALIZATION_ERROR", code: 1,
                            userInfo: [NSLocalizedDescriptionKey: "Failed to serialize TrackResult"]
                        ))
                        return
                    }
                    completion(jsonString, nil)
                case .failure(let error):
                    let nsError = error as? NSError ?? NSError(
                        domain: "TRACK_ERROR",
                        code: 1,
                        userInfo: [NSLocalizedDescriptionKey: error.localizedDescription]
                    )
                    completion(nil, nsError)
                }
            }
            .addTo(disposables)
    }

    @objc public static func shutdown(
        instanceId: String,
        completion: @escaping () -> Void
    ) {
        TealiumPrismInstanceRegistry.shared.remove(instanceId)
        completion()
    }
}
