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
        subscribe(completion, nullableConverter: converter)
    }

    /// Variant of [`Single.subscribe(_:converter:)`](doc:Single/subscribe(_:converter:)) whose
    /// converter may yield no `DataItem` at all.
    ///
    /// A `nil` from the converter completes with a `nil` result rather than a JSON string, which
    /// the `.mm` layer forwards as `resolve(nil)` — a JS `null`. Used for lookups where "absent"
    /// has to stay distinguishable from a stored JSON `null`.
    func subscribe<T, E: Error>(
        _ completion: @escaping (String?, PromiseRejection?) -> Void,
        converter: @escaping (T) -> DataItem?
    ) where Element == Result<T, E> {
        subscribe(completion, nullableConverter: converter)
    }

    /// Shared implementation of the two `subscribe(_:converter:)` overloads.
    private func subscribe<T, E: Error>(
        _ completion: @escaping (String?, PromiseRejection?) -> Void,
        nullableConverter: @escaping (T) -> DataItem?
    ) where Element == Result<T, E> {
        var emitted = false
        subscribe(
            { result in
                emitted = true
                switch result {
                case .success(let value):
                    guard let dataItem = nullableConverter(value) else {
                        completion(nil, nil)
                        return
                    }
                    do {
                        completion(try JsonValueConversions.jsonString(from: dataItem), nil)
                    } catch {
                        // Should never happen if the DataItem contains only json encodable values.
                        completion(nil, PromiseRejection(
                            code: .dataParseError,
                            error: error
                        ))
                    }
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
}
