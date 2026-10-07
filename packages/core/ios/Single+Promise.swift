import Foundation
import TealiumPrism

extension Single {
    /// Subscribes to this `SingleResult`, converting the emitted value to a `DataItem` via
    /// [converter] and completing with its JSON string on success, or with an `NSError`
    /// carrying the underlying error on failure.
    ///
    /// The subscription is a one-shot: it completes on first emission and the SDK retains
    /// it internally until then, so we don't retain the returned `Disposable`.
    func subscribe<T, E: Error>(
        _ completion: @escaping (String?, PromiseRejection?) -> Void,
        converter: @escaping (T) -> DataItem
    ) where Element == Result<T, E> {
        subscribe(completion) { try JsonValueConversions.jsonString(from: converter($0)) }
    }

    /// Subscribes to this String-emitting `SingleResult`, completing with the raw emitted String
    /// value on success, or with a rejection carrying the underlying error on failure. Unlike the
    /// `converter:` overload, the value is not routed through `DataItem`/JSON encoding, so scalar
    /// strings (e.g. a visitor id) reach JS unquoted and need no JS-side parse. The distinct
    /// argument label (no `converter:`) keeps this a separate overload.
    ///
    /// The subscription is a one-shot: it completes on first emission and the SDK retains it
    /// internally until then, so we don't retain the returned `Disposable`.
    func subscribe<E: Error>(
        _ completion: @escaping (String?, PromiseRejection?) -> Void
    ) where Element == Result<String, E> {
        subscribe(completion) { $0 }
    }

    /// One-shot subscription shared by the promise adapters. Maps a successfully emitted value to
    /// the JS result string via [toResult] (a throw there completes with `dataParseError`),
    /// forwards a `.failure` as `prismNativeError`, and completes with `tealiumCancelled` if the
    /// Single finishes without emitting a value.
    private func subscribe<T, E: Error>(
        _ completion: @escaping (String?, PromiseRejection?) -> Void,
        toResult: @escaping (T) throws -> String
    ) where Element == Result<T, E> {
        var emitted = false
        subscribe(
            { result in
                emitted = true
                switch result {
                case .success(let value):
                    do {
                        completion(try toResult(value), nil)
                    } catch {
                        // Should never happen if the DataItem contains only json encodable values.
                        completion(nil, PromiseRejection(code: .dataParseError, error: error))
                    }
                case .failure(let error):
                    completion(nil, PromiseRejection(code: .prismNativeError, error: error))
                }
            },
            onComplete: {
                if !emitted {
                    completion(nil, PromiseRejection(
                        code: .tealiumCancelled,
                        message: "Single completed without emitting a value"
                    ))
                }
            }
        )
    }
}
