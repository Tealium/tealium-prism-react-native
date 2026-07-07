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
        _ completion: @escaping (String?, NSError?) -> Void,
        errorCode: String = ErrorCodes.UNKNOWN_ERROR,
        errorMsg: String? = nil,
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
                    } catch let error as NSError {
                        completion(nil, error)
                    }
                case .failure(let error):
                    completion(nil, NSError(
                        domain: errorCode,
                        code: 1,
                        userInfo: [
                            NSLocalizedDescriptionKey: errorMsg ?? error.localizedDescription,
                            NSUnderlyingErrorKey: error
                        ]
                    ))
                }
            },
            onComplete: {
                if !emitted {
                    completion(nil, NSError(
                        domain: ErrorCodes.TEALIUM_CANCELLED,
                        code: 2,
                        userInfo: [NSLocalizedDescriptionKey: "Single completed without emitting a value"]
                    ))
                }
            }
        )
    }
}
