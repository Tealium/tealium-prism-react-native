import Foundation
import TealiumPrism

extension Single {
    /// Shared one-shot subscription: rejects with the error on failure or with `.tealiumCancelled`
    /// on a non-emitting completion, delegating success handling to `onSuccess` so callers decide
    /// what to complete with.
    ///
    /// The subscription is a one-shot: it completes on first emission and the SDK retains
    /// it internally until then, so we don't retain the returned `Disposable`.
    private func subscribeCore<T, E: Error>(
        _ completion: @escaping (String?, PromiseRejection?) -> Void,
        onSuccess: @escaping (T) -> Void
    ) where Element == Result<T, E> {
        var emitted = false
        subscribe(
            { result in
                emitted = true
                switch result {
                case .success(let value):
                    onSuccess(value)
                case .failure(let error):
                    completion(nil, PromiseRejection(
                        code: .prismNativeError,
                        error: error
                    ))
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

    /// Subscribes to this `SingleResult`, converting the emitted value to a `DataItem` via
    /// [converter] and completing with its JSON string on success, or with an `NSError`
    /// carrying the underlying error on failure.
    func subscribe<T, E: Error>(
        _ completion: @escaping (String?, PromiseRejection?) -> Void,
        converter: @escaping (T) -> DataItem
    ) where Element == Result<T, E> {
        subscribeCore(completion) { value in
            do {
                completion(try JsonValueConversions.jsonString(from: converter(value)), nil)
            } catch {
                // Should never happen if the DataItem contains only json encodable values.
                completion(nil, PromiseRejection(
                    code: .dataParseError,
                    error: error
                ))
            }
        }
    }

    /// Subscribes to a `SingleResult` that carries no payload, completing with a `nil` JSON
    /// string on success (so the JS promise resolves to `undefined`) or with an `NSError` on
    /// failure. Used by one-shot Void-returning APIs such as `Trace.join`/`Trace.leave`.
    func subscribe<E: Error>(
        _ completion: @escaping (String?, PromiseRejection?) -> Void
    ) where Element == Result<Void, E> {
        subscribeCore(completion) { (_: Void) in completion(nil, nil) }
    }
}
