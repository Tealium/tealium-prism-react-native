import Foundation
import TealiumPrism

@objc(TealiumPrismBridge)
public final class TealiumPrismBridge: NSObject {

    /// Converts a JSON string inbound through the Prism SDK's DataObject
    /// representation and back out as a JSON string, exercising the full
    /// conversion path without any side effects.
    ///
    /// Accepts a JSON string rather than an NSDictionary so that JS `null`
    /// values survive the TurboModule bridge: `JSONSerialization` maps JSON
    /// null to `NSNull`, whereas the TurboModule bridge drops nil-valued keys
    /// from NSDictionary before the method body runs.
    @objc public static func echoDataObjectFromJSON(
        _ jsonString: String,
        error: NSErrorPointer
    ) -> String? {
        do {
            guard let data = jsonString.data(using: .utf8),
                  let jsonObject = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            else {
                error?.pointee = NSError(
                    domain: "TealiumPrismBridge",
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Input is not a valid JSON object"]
                )
                return nil
            }
            let dataObject = try DataObject(jsonObject: jsonObject)
            let result = dataObject.asDictionary()
            let outputData = try JSONSerialization.data(withJSONObject: result)
            return String(data: outputData, encoding: .utf8)
        } catch let e as NSError {
            error?.pointee = e
            return nil
        }
    }
}
