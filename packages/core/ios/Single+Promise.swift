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
        var emitted = false
        subscribe(
            { result in
                emitted = true
                switch result {
                case .success(let value):
                    do {
                        completion(try JsonValueConversions.jsonString(from: converter(value)), nil)
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
