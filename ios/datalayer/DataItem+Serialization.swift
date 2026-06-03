//
//  DataItem+Serialization.swift
//  TealiumPrismReactNative
//
//  Converts native Prism SDK types into NSDictionary/NSArray for JS.
//

import Foundation
import TealiumPrism

extension DataItem {

    // Returns the raw unwrapped value. Nested DataList/DataObject are also unwrapped recursively.
    // Uses only public DataItem API because DataItem.value is internal to the SDK module.
    func toRawValue() -> Any {
        if let array = getDataArray() { return array.map { $0.toRawValue() } }
        if let dict = getDataDictionary() { return dict.mapValues { $0.toRawValue() } }
        if let str: String = get() { return str }
        if let b: Bool = get() { return b }
        if let n: Double = get() { return n }
        return NSNull()
    }

    // Wraps raw value in {value:} for getDataItem. Required because TurboModule
    // spec declares Object return type — a raw scalar cannot be returned directly.
    func toValueWrapper() -> [String: Any] {
        return ["value": toRawValue()]
    }
}
