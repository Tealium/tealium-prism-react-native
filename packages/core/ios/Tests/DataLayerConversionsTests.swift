import XCTest
import TealiumPrism
@testable import TealiumPrismReactNative

final class DataLayerConversionsTests: XCTestCase {

    // MARK: - expiry(fromEncoded:)

    func test_expiry_with_nil_returns_nil() {
        XCTAssertNil(DataLayerConversions.expiry(fromEncoded: nil))
    }

    func test_expiry_with_minus_one_resolves_to_forever() {
        guard let expiry = DataLayerConversions.expiry(fromEncoded: NSNumber(value: -1)) else {
            XCTFail("-1 should resolve to an expiry")
            return
        }
        XCTAssertEqual(expiry, .forever)
    }

    func test_expiry_with_minus_two_resolves_to_session() {
        guard let expiry = DataLayerConversions.expiry(fromEncoded: NSNumber(value: -2)) else {
            XCTFail("-2 should resolve to an expiry")
            return
        }
        XCTAssertEqual(expiry, .session)
    }

    func test_expiry_with_minus_three_resolves_to_until_restart() {
        guard let expiry = DataLayerConversions.expiry(fromEncoded: NSNumber(value: -3)) else {
            XCTFail("-3 should resolve to an expiry")
            return
        }
        XCTAssertEqual(expiry, .untilRestart)
    }

    func test_expiry_with_positive_seconds_resolves_to_date_ninety_seconds_from_now() {
        guard let expiry = DataLayerConversions.expiry(fromEncoded: NSNumber(value: 90)),
              case .after(let date) = expiry else {
            XCTFail("90 should resolve to a date-based expiry")
            return
        }
        XCTAssertEqual(date.timeIntervalSinceNow, 90, accuracy: 5)
    }

    func test_expiry_with_fractional_number_resolves_to_date_about_one_second_from_now() {
        guard let expiry = DataLayerConversions.expiry(fromEncoded: NSNumber(value: 1.5)),
              case .after(let date) = expiry else {
            XCTFail("1.5 should resolve to a date-based expiry, truncated by the SDK to 1 second")
            return
        }
        XCTAssertEqual(date.timeIntervalSinceNow, 1, accuracy: 5)
    }

    func test_expiry_with_unknown_negative_sentinel_returns_nil() {
        XCTAssertNil(DataLayerConversions.expiry(fromEncoded: NSNumber(value: -99)))
    }

    // MARK: - JSON <-> DataObject round trip

    func test_dataObject_roundTrip_preserves_nested_values() throws {
        let json = #"""
        {
          "string": "value",
          "whole": 42,
          "fractional": 1.5,
          "boolean": true,
          "stored_null": null,
          "array": [1, "two", false, null, {"inner": 3}],
          "object": {"nested": {"deep": [1, 2]}, "flag": false}
        }
        """#

        let dataObject = try DataObject(jsonString: json)
        let encoded = try JsonValueConversions.jsonString(from: DataItem(converting: dataObject))

        guard let expected = try JSONSerialization.jsonObject(with: Data(json.utf8)) as? NSDictionary,
              let actual = try JSONSerialization.jsonObject(with: Data(encoded.utf8)) as? NSDictionary else {
            XCTFail("Both the input and the round-tripped JSON should be objects")
            return
        }
        XCTAssertEqual(expected, actual)
    }

    func test_dataItem_roundTrip_preserves_stored_null() throws {
        let dataItem = try JsonValueConversions.dataItem(fromJSONString: "null")
        XCTAssertEqual(try JsonValueConversions.jsonString(from: dataItem), "null")
    }
}
