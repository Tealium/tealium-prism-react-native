import Foundation
import TealiumPrism

extension TealiumInstanceManager {
    /// Looks up the `Tealium` instance identified by `key` and invokes `found` with it once
    /// resolved. If no instance exists for `key`, calls `rejection` with a `PromiseRejection`
    /// whose code is `.instanceNotFound` instead of invoking `found`.
    func withInstance(
        _ key: String,
        rejection: @escaping (PromiseRejection) -> Void,
        found: @escaping (Tealium) -> Void
    ) {
        get(key) { instance in
            guard let instance else {
                rejection(PromiseRejection(
                    code: .instanceNotFound,
                    message: "No Tealium instance with key '\(key)'")
                )
                return
            }
            found(instance)
        }
    }

    /// For bridge methods resolving to a JSON string: rejects with `(nil, error)`.
    func withInstance(
        _ key: String,
        rejection: @escaping (String?, PromiseRejection?) -> Void,
        found: @escaping (Tealium) -> Void
    ) {
        withInstance(key, rejection: { rejection(nil, $0) }, found: found)
    }
}
