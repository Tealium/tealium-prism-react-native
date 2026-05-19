//
//  TealiumPrismBridge+Serialization.swift
//  TealiumPrismReactNative
//
//  Converts native Prism SDK types into NSDictionary/NSArray for JS.
//

import Foundation
import TealiumPrism

extension DataItem {

    // Converts a DataItem into {type, value} format for get(key).
    // JS needs the "type" field to tell apart numbers, strings, lists, etc.
    // Uses only public DataItem API because DataItem.value is internal to the SDK module.
    func toJSDictionary() -> [String: Any] {
        if let array = getDataArray() {
            return ["type": "list", "value": array.map { $0.toJSDictionary() }]
        }
        if let dict = getDataDictionary() {
            return ["type": "object", "value": dict.mapValues { $0.toJSDictionary() }]
        }
        if let str: String = get() {
            return ["type": "string", "value": str]
        }
        if let b: Bool = get() {
            return ["type": "boolean", "value": b]
        }
        if let n: Double = get() {
            return ["type": "number", "value": n]
        }
        return ["type": "null"]
    }
}
