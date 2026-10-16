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
        let single = Observables.just(Result<String, Error>.success("visitor-123")).asSingle(queue: .worker)
        let completed = expectation(description: "Completion is called")
        var result: String?
        var rejection: PromiseRejection?

        single.subscribe({ value, error in
            result = value
            rejection = error
            completed.fulfill()
        }, converter: { DataItem(value: $0) })

        wait(for: [completed], timeout: timeout)
        XCTAssertEqual(result, "\"visitor-123\"")
        XCTAssertNil(rejection)
    }

    func test_subscribe_with_failure_completes_with_prism_native_error() {
        let single = Observables.just(Result<String, Error>.failure(TestError())).asSingle(queue: .worker)
        let completed = expectation(description: "Completion is called")
        var result: String?
        var rejection: PromiseRejection?

        single.subscribe({ value, error in
            result = value
            rejection = error
            completed.fulfill()
        }, converter: { DataItem(value: $0) })

        wait(for: [completed], timeout: timeout)
        XCTAssertNil(result)
        guard let rejection else {
            XCTFail("A failed Single should complete with a rejection")
            return
        }
        XCTAssertEqual(rejection.code, ErrorCode.prismNativeError.rawValue)
        XCTAssertEqual(rejection.message, "boom")
        XCTAssertTrue(rejection.error is TestError)
    }

    func test_subscribe_with_completion_without_emission_completes_with_tealium_cancelled() {
        let observable: Observable<Result<String, Error>> = Observables.empty()
        let single = observable.asSingle(queue: .worker)
        let completed = expectation(description: "Completion is called")
        var result: String?
        var rejection: PromiseRejection?

        single.subscribe({ value, error in
            result = value
            rejection = error
            completed.fulfill()
        }, converter: { DataItem(value: $0) })

        wait(for: [completed], timeout: timeout)
        XCTAssertNil(result)
        XCTAssertEqual(rejection?.code, ErrorCode.tealiumCancelled.rawValue)
    }

    // MARK: - subscribe(_:converter:) with a nullable converter

    func test_subscribe_with_nil_conversion_completes_with_nil_result() {
        let single = Observables.just(Result<String, Error>.success("absent")).asSingle(queue: .worker)
        let completed = expectation(description: "Completion is called")
        var result: String?
        var rejection: PromiseRejection?

        single.subscribe({ value, error in
            result = value
            rejection = error
            completed.fulfill()
        }, converter: { _ in nil })

        wait(for: [completed], timeout: timeout)
        XCTAssertNil(result)
        XCTAssertNil(rejection)
    }

    func test_subscribe_with_stored_null_completes_with_json_null_string() throws {
        let storedNull = try DataItem(jsonString: "null")
        let single = Observables.just(Result<String, Error>.success("stored")).asSingle(queue: .worker)
        let completed = expectation(description: "Completion is called")
        var result: String?
        var rejection: PromiseRejection?

        single.subscribe({ value, error in
            result = value
            rejection = error
            completed.fulfill()
        }, converter: { _ in storedNull })

        wait(for: [completed], timeout: timeout)
        XCTAssertEqual(result, "null")
        XCTAssertNil(rejection)
    }

    // MARK: - subscribeVoid(_:)

    func test_subscribeVoid_with_success_completes_without_rejection() {
        let single = Observables.just(Result<Void, Error>.success(())).asSingle(queue: .worker)
        let completed = expectation(description: "Completion is called")
        var rejection: PromiseRejection?

        single.subscribeVoid { error in
            rejection = error
            completed.fulfill()
        }

        wait(for: [completed], timeout: timeout)
        XCTAssertNil(rejection)
    }

    func test_subscribeVoid_with_failure_completes_with_prism_native_error() {
        let single = Observables.just(Result<Void, Error>.failure(TestError())).asSingle(queue: .worker)
        let completed = expectation(description: "Completion is called")
        var rejection: PromiseRejection?

        single.subscribeVoid { error in
            rejection = error
            completed.fulfill()
        }

        wait(for: [completed], timeout: timeout)
        XCTAssertEqual(rejection?.code, ErrorCode.prismNativeError.rawValue)
    }
}
