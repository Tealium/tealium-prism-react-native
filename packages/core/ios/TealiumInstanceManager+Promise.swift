import Foundation
import TealiumPrism

extension TealiumInstanceManager {
    /// Looks up the `Tealium` instance identified by `key` and invokes `found` with it once
    /// resolved. If no instance exists for `key`, calls `completion(nil, error)` with an
    /// "INSTANCE_NOT_FOUND" error instead of invoking `found`.
    ///
    /// `onNotFound` runs first on that path: it is the hook for callers that recorded state
    /// before the lookup (e.g. a pending subscription entry) and must undo it before the
    /// rejection reaches JS.
    func withInstance(
        _ key: String,
        completion: @escaping (String?, PromiseRejection?) -> Void,
        onNotFound: (() -> Void)? = nil,
        found: @escaping (Tealium) -> Void
    ) {
        get(key) { instance in
            guard let instance else {
                onNotFound?()
                completion(nil, PromiseRejection(
                    code: .instanceNotFound,
                    message: "No Tealium instance with key '\(key)'")
                )
                return
            }
            found(instance)
        }
    }
}
