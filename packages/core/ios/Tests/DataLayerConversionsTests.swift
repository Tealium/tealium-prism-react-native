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

    func test_expiry_with_millisecond_timestamp_resolves_to_date_at_that_timestamp() {
        guard let expiry = DataLayerConversions.expiry(fromEncoded: NSNumber(value: 1_700_000_000_000)),
              case .after(let date) = expiry else {
            XCTFail("A millisecond timestamp should resolve to a date-based expiry")
            return
        }
        XCTAssertEqual(date.timeIntervalSince1970, 1_700_000_000, accuracy: 0.001)
    }

    func test_expiry_with_sub_second_timestamp_preserves_milliseconds() {
        guard let expiry = DataLayerConversions.expiry(fromEncoded: NSNumber(value: 1_700_000_000_123)),
              case .after(let date) = expiry else {
            XCTFail("A sub-second timestamp should resolve to a date-based expiry")
            return
        }
        // The Prism Swift SDK's `Expiry.init(timestamp:)` is millisecond-accurate, unlike the
        // Kotlin bridge, which truncates to the epoch second (see resolveExpiry in
        // DataLayerConversions.kt).
        XCTAssertEqual(date.timeIntervalSince1970, 1_700_000_000.123, accuracy: 0.001)
    }

    func test_expiry_with_zero_resolves_to_unix_epoch_date() {
        guard let expiry = DataLayerConversions.expiry(fromEncoded: NSNumber(value: 0)),
              case .after(let date) = expiry else {
            XCTFail("0 should resolve to a date-based expiry")
            return
        }
        XCTAssertEqual(date.timeIntervalSince1970, 0, accuracy: 0.001)
    }

    func test_expiry_with_future_timestamp_is_not_expired() {
        let inOneHourMilliseconds = Int64((Date().timeIntervalSince1970 + 3_600) * 1000)
        guard let expiry = DataLayerConversions.expiry(fromEncoded: NSNumber(value: inOneHourMilliseconds)),
              case .after(let date) = expiry else {
            XCTFail("A future timestamp should resolve to a date-based expiry")
            return
        }
        XCTAssertTrue(date > Date())
    }

    func test_expiry_with_past_timestamp_is_expired() {
        let oneHourAgoMilliseconds = Int64((Date().timeIntervalSince1970 - 3_600) * 1000)
        guard let expiry = DataLayerConversions.expiry(fromEncoded: NSNumber(value: oneHourAgoMilliseconds)),
              case .after(let date) = expiry else {
            XCTFail("A past timestamp should resolve to a date-based expiry")
            return
        }
        XCTAssertTrue(date < Date())
    }

    func test_expiry_with_unknown_negative_value_resolves_to_past_timestamp() {
        guard let expiry = DataLayerConversions.expiry(fromEncoded: NSNumber(value: -99)),
              case .after(let date) = expiry else {
            XCTFail("An unknown negative value should resolve to a date-based expiry, not a sentinel")
            return
        }
        XCTAssertEqual(date.timeIntervalSince1970, -0.099, accuracy: 0.001)
        XCTAssertTrue(date < Date())
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
