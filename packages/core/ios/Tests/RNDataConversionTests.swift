//
//  RNDataConversionTests.swift
//  TealiumPrismReactNativeTests
//
//  Round-trip and type-fidelity tests for the iOS bridge converters.
//

import XCTest
import TealiumPrism
@testable import TealiumPrismReactNative

final class RNDataConversionTests: XCTestCase {

    // MARK: - Helpers

    /// Inbound then outbound: JS dict -> DataObject -> Foundation dict.
    private func roundTrip(_ input: [String: Any]) throws -> [String: Any] {
        let object = try RNDataConversion.dataObject(from: input)
        return RNDataConversion.foundationDictionary(from: object)
    }

    // MARK: - Inbound

    func test_inbound_primitives() throws {
        let object = try RNDataConversion.dataObject(from: [
            "s": "hi",
            "b": true,
            "n": 7,
            "f": 1.5,
            "x": NSNull(),
        ])

        XCTAssertEqual(object.getDataItem(key: "s")?.get(as: String.self), "hi")
        XCTAssertEqual(object.getDataItem(key: "b")?.get(as: Bool.self), true)
        XCTAssertEqual(object.getDataItem(key: "n")?.get(as: Int.self), 7)
        XCTAssertEqual(object.getDataItem(key: "f")?.get(as: Double.self), 1.5)
        // NSNull is a valid stored value, distinct from Swift nil.
        XCTAssertNotNil(object.getDataItem(key: "x"))
    }

    // MARK: - Outbound / round-trip primitives

    func test_string_roundTrips() throws {
        let out = try roundTrip(["s": "hi"])
        XCTAssertEqual(out["s"] as? String, "hi")
    }

    func test_bool_isNotCoercedToNumber() throws {
        let out = try roundTrip(["b": true])
        // Bool must round-trip as a boolean NSNumber, not the integer 1.
        let value = out["b"] as? NSNumber
        XCTAssertEqual(value, NSNumber(value: true))
        XCTAssertEqual(CFGetTypeID(value as CFTypeRef), CFBooleanGetTypeID())
    }

    func test_int_roundTrips() throws {
        let out = try roundTrip(["n": 7])
        XCTAssertEqual(out["n"] as? Int, 7)
    }

    func test_doubleFractional_staysDouble() throws {
        let out = try roundTrip(["f": 1.5])
        XCTAssertEqual(out["f"] as? Double, 1.5)
    }

    func test_wholeNumber_isIntLike() throws {
        // iOS asymmetry vs Android: a whole Double round-trips to Int via the
        // JSON encode/decode in DataObject(jsonObject:).
        let out = try roundTrip(["whole": 42.0])
        XCTAssertEqual(out["whole"] as? Int, 42)
    }

    // MARK: - Null preservation

    func test_topLevelNull_roundTrips() throws {
        let out = try roundTrip(["x": NSNull()])
        XCTAssertTrue(out["x"] is NSNull)
    }

    func test_nestedNull_inObject() throws {
        let out = try roundTrip(["nested": ["inner": NSNull()]])
        let nested = out["nested"] as? [String: Any]
        XCTAssertTrue(nested?["inner"] is NSNull)
    }

    func test_nestedNull_inArray() throws {
        let out = try roundTrip(["arr": ["a", NSNull(), "b"]])
        let array = out["arr"] as? [Any]
        XCTAssertEqual(array?.count, 3)
        XCTAssertTrue(array?[1] is NSNull)
    }

    // MARK: - Nested structures

    func test_nestedObject_roundTrips() throws {
        let out = try roundTrip(["user": ["name": "Ann", "age": 30]])
        let user = out["user"] as? [String: Any]
        XCTAssertEqual(user?["name"] as? String, "Ann")
        XCTAssertEqual(user?["age"] as? Int, 30)
    }

    func test_nestedArray_roundTrips() throws {
        let out = try roundTrip(["matrix": [[1, 2], [3, 4]]])
        let matrix = out["matrix"] as? [Any]
        let row = matrix?[1] as? [Any]
        XCTAssertEqual(row?[0] as? Int, 3)
    }

    func test_mixedArray_roundTrips() throws {
        let out = try roundTrip(["tags": ["a", 2, false, NSNull(), ["k": "v"]]])
        let tags = out["tags"] as? [Any]
        XCTAssertEqual(tags?.count, 5)
        XCTAssertEqual(tags?[0] as? String, "a")
        XCTAssertEqual(tags?[1] as? Int, 2)
        XCTAssertEqual((tags?[2] as? NSNumber), NSNumber(value: false))
        XCTAssertTrue(tags?[3] is NSNull)
        XCTAssertEqual((tags?[4] as? [String: Any])?["k"] as? String, "v")
    }

    // MARK: - Empty containers

    func test_emptyObject_roundTrips() throws {
        let out = try roundTrip(["obj": [String: Any]()])
        XCTAssertNotNil(out["obj"] as? [String: Any])
        XCTAssertEqual((out["obj"] as? [String: Any])?.count, 0)
    }

    func test_emptyArray_roundTrips() throws {
        let out = try roundTrip(["arr": [Any]()])
        XCTAssertNotNil(out["arr"] as? [Any])
        XCTAssertEqual((out["arr"] as? [Any])?.count, 0)
    }

    // MARK: - Depth, boundaries, unicode

    func test_deepNesting_roundTrips() throws {
        let out = try roundTrip(["l1": ["l2": ["l3": ["leaf": "deep"]]]])
        let leaf = ((out["l1"] as? [String: Any])?["l2"] as? [String: Any])?["l3"] as? [String: Any]
        XCTAssertEqual(leaf?["leaf"] as? String, "deep")
    }

    func test_intBoundary() throws {
        let out = try roundTrip(["max": Int.max, "min": Int.min])
        XCTAssertEqual(out["max"] as? Int, Int.max)
        XCTAssertEqual(out["min"] as? Int, Int.min)
    }

    func test_unicodeString_roundTrips() throws {
        let out = try roundTrip(["emoji": "héllo 🌍"])
        XCTAssertEqual(out["emoji"] as? String, "héllo 🌍")
    }

    // MARK: - Invalid inbound

    func test_invalidJSON_throws() {
        // A non-JSON-serializable value (Foundation Date wrapped as Any is
        // serializable to a string, so use a bespoke non-serializable object).
        final class NotSerializable {}
        XCTAssertThrowsError(
            try RNDataConversion.dataObject(from: ["bad": NotSerializable()])
        )
    }
}
