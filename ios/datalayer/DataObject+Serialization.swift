//
//  TealiumPrismBridge+Serialization.swift
//  TealiumPrismReactNative
//
//  Converts native Prism SDK types into NSDictionary/NSArray for JS.
//

import Foundation
import TealiumPrism

extension DataObject {

    // Converts a DataObject into a plain {key: value} map. Used by getAll() and event emission.
    // Unlike toJSDictionary, values here are raw (no {type, value} wrapping).
    func toRawDict() -> [String: Any] {
        asDictionary().mapValues { $0 as Any }
    }
}
