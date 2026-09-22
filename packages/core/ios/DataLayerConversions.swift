import Foundation
import TealiumPrism

/// Pure conversions for the JS wire formats used by the `DataLayer` bridge methods.
enum DataLayerConversions {

    /// Resolves the JS-encoded expiry number into an `Expiry`.
    ///
    /// `encoded` is handed straight to the SDK: the meaning of the value — the negative sentinels,
    /// non-negative durations in seconds, and how a fractional value like `1.5` truncates — belongs
    /// to [`ExpiryPolicy.converter`](doc:ExpiryPolicy/converter), not to this wrapper.
    ///
    /// - Parameter encoded: The encoded policy as it arrived from JS, or `nil` when JS omitted it.
    /// - Returns: The resolved `Expiry`, or `nil` when `encoded` is `nil` or is not a value the SDK
    ///   converter recognises.
    static func expiry(fromEncoded encoded: NSNumber?) -> Expiry? {
        guard let encoded, let policy = ExpiryPolicy.converter.convert(dataItem: DataItem(value: encoded)) else {
            return nil
        }
        return policy.resolve()
    }

    /// Parses the JSON array of key names the JS layer sends to `dataLayerRemove`.
    ///
    /// - Parameter jsonString: A JSON array whose every element is a string.
    /// - Returns: The parsed keys.
    /// - Throws: An error when `jsonString` is not valid JSON, is not an array, or holds a
    ///   non-string element.
    static func keys(fromJSONString jsonString: String) throws -> [String] {
        guard let data = jsonString.data(using: .utf8) else {
            throw error("Input is not valid UTF-8")
        }
        let parsed = try JSONSerialization.jsonObject(with: data)
        guard let keys = parsed as? [String] else {
            throw error("Expected a JSON array of strings")
        }
        return keys
    }

    private static func error(_ description: String) -> NSError {
        NSError(
            domain: "TealiumPrismBridge",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: description]
        )
    }
}
