import Foundation
import TealiumPrism

// TODO: Consider making 'DataItem from JSON string' API public in Prism for iOS, so that it could be used the same way as on Android.
enum JsonValueConversions {
    static func dataItem(fromJSONString jsonString: String) throws -> DataItem {
        guard let data = jsonString.data(using: .utf8) else {
            throw NSError(
                domain: "TealiumPrismBridge",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Input is not valid UTF-8"]
            )
        }
        let jsonValue = try JSONSerialization.jsonObject(with: data, options: .fragmentsAllowed)
        return try DataItem(jsonValue: jsonValue)
    }

    static func jsonString(from dataItem: DataItem) throws -> String {
        let encoded = try Tealium.jsonEncoder.encode(AnyEncodable(dataItem.toDataInput()))
        return String(decoding: encoded, as: UTF8.self)
    }
}
