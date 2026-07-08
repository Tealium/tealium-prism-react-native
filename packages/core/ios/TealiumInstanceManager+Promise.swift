import Foundation
import TealiumPrism

extension TealiumInstanceManager {
    /// Looks up the `Tealium` instance identified by `key` and invokes `found` with it once
    /// resolved. If no instance exists for `key`, calls `completion(nil, error)` with an
    /// `INSTANCE_NOT_FOUND` error instead of invoking `found`.
    func withInstance(
        _ key: String,
        completion: @escaping (String?, PromiseRejection?) -> Void,
        found: @escaping (Tealium) -> Void
    ) {
        get(key) { instance in
            guard let instance else {
                completion(nil, PromiseRejection(
                    code: .INSTANCE_NOT_FOUND,
                    message: "No Tealium instance with key '\(key)'")
                )
                return
            }
            found(instance)
        }
    }
}
