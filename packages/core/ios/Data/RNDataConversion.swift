//
//  RNDataConversion.swift
//  TealiumPrismReactNative
//
//  Internal bridge-boundary converters between React Native Foundation types
//  and the Prism SDK's DataObject/DataItem model.
//

import Foundation
import TealiumPrism

/// Converts between React Native bridge types (Foundation `NSDictionary` /
/// `NSArray`, surfaced in Swift as `[String: Any]` / `[Any]`) and the Prism
/// SDK `DataObject` / `DataItem` model.
///
/// Inbound delegates entirely to the SDK; outbound walks the tree to produce
/// concrete Foundation objects that the TurboModule bridge can return to JS.
enum RNDataConversion {

    // MARK: - Inbound (JS -> Native)

    /// Converts a Foundation dictionary received from the RN bridge into a
    /// `DataObject`.
    ///
    /// Delegates to `DataObject(jsonObject:)`, which performs a JSON round-trip
    /// and handles nested containers, `NSNull`, and non-finite floats (NaN /
    /// Infinity become strings) internally. No manual type-switching needed.
    ///
    /// - Throws: `JSONParsingError` if the input is not JSON-serializable.
    static func dataObject(from dictionary: [String: Any]) throws -> DataObject {
        try DataObject(jsonObject: dictionary)
    }

    // MARK: - Outbound (Native -> JS)

    /// Converts a `DataObject` into a bridge-safe Foundation dictionary.
    ///
    /// The result contains only `NSString` / `NSNumber` / `NSNull` / `[Any]` /
    /// `[String: Any]`, which the TurboModule bridge converts to JS values
    /// directly.
    static func foundationDictionary(from object: DataObject) -> [String: Any] {
        object.asDictionary().reduce(into: [String: Any]()) { result, entry in
            result[entry.key] = foundationValue(from: DataItem(value: entry.value))
        }
    }

    /// Converts a single `DataItem` into a bridge-safe Foundation value.
    ///
    /// Containers are walked recursively so that nested `[DataInput]` /
    /// `[String: DataInput]` (existential collections that would not bridge to
    /// ObjC cleanly) become concrete `[Any]` / `[String: Any]`. Leaves use
    /// `toDataInput()`, whose dynamic type is already a Foundation object
    /// (`NSString`, `NSNumber`, `NSNull`). `NSNull` is preserved as JSON null.
    static func foundationValue(from item: DataItem) -> Any {
        if let dictionary = item.getDataDictionary() {
            return dictionary.mapValues { foundationValue(from: $0) }
        }
        if let array = item.getDataArray() {
            return array.map { foundationValue(from: $0) }
        }
        return item.toDataInput()
    }
}
