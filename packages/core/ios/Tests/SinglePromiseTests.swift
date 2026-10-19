import XCTest
import TealiumPrism
@testable import TealiumPrismReactNative

/// Unit tests for the bridge's `SingleResult` -> promise completion adapters, which every
/// promise-returning bridge method goes through.
final class SinglePromiseTests: XCTestCase {

    private struct TestError: LocalizedError {
        var errorDescription: String? { "boom" }
    }

    private let timeout: TimeInterval = 1.0

    // MARK: - subscribe(_:converter:)

    func test_subscribe_with_string_success_completes_with_json_encoded_string() {
        let single = Observables.just(Result<String, Error>.success("visitor-123")).asSingle(queue: .main)
        let completed = expectation(description: "Completion is called")

        single.subscribe({ value, rejection in
            XCTAssertEqual(value, "\"visitor-123\"")
            XCTAssertNil(rejection)
            completed.fulfill()
        }, converter: { DataItem(value: $0) })

        wait(for: [completed], timeout: timeout)
    }

    func test_subscribe_with_failure_completes_with_prism_native_error() {
        let single = Observables.just(Result<String, Error>.failure(TestError())).asSingle(queue: .main)
        let completed = expectation(description: "Completion is called")

        single.subscribe({ value, rejection in
            defer { completed.fulfill() }
            XCTAssertNil(value)
            guard let rejection else {
                XCTFail("A failed Single should complete with a rejection")
                return
            }
            XCTAssertEqual(rejection.code, ErrorCode.prismNativeError.rawValue)
            XCTAssertEqual(rejection.message, "boom")
            XCTAssertTrue(rejection.error is TestError)
        }, converter: { DataItem(value: $0) })

        wait(for: [completed], timeout: timeout)
    }

    func test_subscribe_with_completion_without_emission_completes_with_tealium_cancelled() {
        let observable: Observable<Result<String, Error>> = Observables.empty()
        let single = observable.asSingle(queue: .main)
        let completed = expectation(description: "Completion is called")

        single.subscribe({ value, rejection in
            XCTAssertNil(value)
            XCTAssertEqual(rejection?.code, ErrorCode.tealiumCancelled.rawValue)
            completed.fulfill()
        }, converter: { DataItem(value: $0) })

        wait(for: [completed], timeout: timeout)
    }

    // MARK: - subscribe(_:converter:) with a nullable converter

    func test_subscribe_with_nil_conversion_completes_with_nil_result() {
        let single = Observables.just(Result<String, Error>.success("absent")).asSingle(queue: .main)
        let completed = expectation(description: "Completion is called")

        single.subscribe({ value, rejection in
            XCTAssertNil(value)
            XCTAssertNil(rejection)
            completed.fulfill()
        }, converter: { _ in nil })

        wait(for: [completed], timeout: timeout)
    }

    func test_subscribe_with_stored_null_completes_with_json_null_string() throws {
        let storedNull = try DataItem(jsonString: "null")
        let single = Observables.just(Result<String, Error>.success("stored")).asSingle(queue: .main)
        let completed = expectation(description: "Completion is called")

        single.subscribe({ value, rejection in
            XCTAssertEqual(value, "null")
            XCTAssertNil(rejection)
            completed.fulfill()
        }, converter: { _ in storedNull })

        wait(for: [completed], timeout: timeout)
    }

    // MARK: - subscribeVoid(_:)

    func test_subscribeVoid_with_success_completes_without_rejection() {
        let single = Observables.just(Result<Void, Error>.success(())).asSingle(queue: .main)
        let completed = expectation(description: "Completion is called")

        single.subscribeVoid { rejection in
            XCTAssertNil(rejection)
            completed.fulfill()
        }

        wait(for: [completed], timeout: timeout)
    }

    func test_subscribeVoid_with_failure_completes_with_prism_native_error() {
        let single = Observables.just(Result<Void, Error>.failure(TestError())).asSingle(queue: .main)
        let completed = expectation(description: "Completion is called")

        single.subscribeVoid { rejection in
            XCTAssertEqual(rejection?.code, ErrorCode.prismNativeError.rawValue)
            completed.fulfill()
        }

        wait(for: [completed], timeout: timeout)
    }
}
