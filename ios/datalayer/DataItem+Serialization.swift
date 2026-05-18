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
    func toJSDictionary() -> [String: Any] {
        switch value {
        case let str as String: return ["type": "string", "value": str]
        case let b as Bool: return ["type": "boolean", "value": b]
        case let n as NSNumber: return ["type": "number", "value": n.doubleValue]
        case is [Any]:
            return ["type": "list", "value": getDataArray()?.map { $0.toJSDictionary() } ?? []]
        case is [String: Any]:
            return [
                "type": "object",
                "value": getDataDictionary()?.mapValues { $0.toJSDictionary() } ?? [:],
            ]
        default: return ["type": "null"]
        }
    }
}
