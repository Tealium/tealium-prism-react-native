import Foundation
import TealiumPrism

/// Pure conversions for the JS wire formats used by the `DataLayer` bridge methods.
enum DataLayerConversions {

    /// Resolves the JS-encoded expiry number into an `Expiry`.
    ///
    /// `encoded` is handed straight to the SDK: the meaning of the value — the negative sentinels
    /// and the Unix millisecond timestamp otherwise — belongs to
    /// [`Expiry.init(timestamp:)`](doc:Expiry/init(timestamp:)), not to this wrapper.
    ///
    /// - Parameter encoded: The encoded expiry as it arrived from JS, or `nil` when JS omitted it.
    /// - Returns: The resolved `Expiry`, or `nil` when `encoded` is `nil`.
    static func expiry(fromEncoded encoded: NSNumber?) -> Expiry? {
        guard let encoded else {
            return nil
        }
        return Expiry(timestamp: encoded.int64Value)
    }
}
