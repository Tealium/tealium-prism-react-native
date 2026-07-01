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
}
