//
//  RNDataConversion.swift
//  TealiumPrismReactNative
//
//  Converts JS/RN values (NSDictionary, NSArray) into native Prism SDK types.
//

import Foundation
import TealiumPrism

/// Recursively converts an NSDictionary (from JS) into a native DataObject.
func dataObject(from dict: [String: Any]) -> DataObject {
    var result = DataObject()
    for (key, value) in dict {
        if let convertible = value as? DataInputConvertible {
            result.set(converting: convertible, key: key)
        } else if let arr = value as? [String] {
            result.set(converting: arr, key: key)
        } else if let arr = value as? [Double] {
            result.set(converting: arr, key: key)
        } else if let arr = value as? [Bool] {
            result.set(converting: arr, key: key)
        } else if let nested = value as? [String: Any] {
            result.set(converting: dataObject(from: nested), key: key)
        } else if let arr = value as? [[String: Any]] {
            result.set(converting: arr.map { dataObject(from: $0) }, key: key)
        } else if let arr = value as? NSArray {
            // Fallback for heterogeneous arrays (mixed element types) that
            // don't match the homogeneous branches above.
            result.set(convertArrayToDataInputList(arr), key: key)
        }
    }
    return result
}

/// Converts a mixed-type array from JS into native DataInput values.
/// Checks CFBooleanGetTypeID() first because ObjC represents JS booleans as NSNumber,
/// and without this check `true` would be stored as the number 1.
func convertArrayToDataInputList(_ array: NSArray) -> [DataInput] {
    var result: [DataInput] = []
    for element in array {
        if element is NSNull {
            result.append(NSNull())
        } else if let str = element as? String {
            result.append(str)
        } else if CFGetTypeID(element as CFTypeRef) == CFBooleanGetTypeID(), let b = element as? Bool {
            result.append(b)
        } else if let num = element as? NSNumber {
            result.append(num.doubleValue)
        } else if let dict = element as? [String: Any] {
            result.append(dataObject(from: dict).toDataInput())
        } else if let arr = element as? NSArray {
            result.append(convertArrayToDataInputList(arr))
        }
    }
    return result
}
