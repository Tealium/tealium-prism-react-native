import Foundation
import TealiumPrism

enum DataObjectConversions {

    static func dataObject(fromJSONString jsonString: String) throws -> DataObject {
        guard let data = jsonString.data(using: .utf8),
              let jsonObject = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            throw NSError(
                domain: "TealiumPrismBridge",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Input is not a valid JSON object"]
            )
        }
        return try DataObject(jsonObject: jsonObject)
    }

    static func jsonString(from dataObject: DataObject) throws -> String {
        let result = dataObject.asDictionary()
        let data = try JSONSerialization.data(withJSONObject: result)
        guard let string = String(data: data, encoding: .utf8) else {
            throw NSError(
                domain: "TealiumPrismBridge",
                code: 2,
                userInfo: [NSLocalizedDescriptionKey: "Failed to encode DataObject as UTF-8"]
            )
        }
        return string
    }
}
