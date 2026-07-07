import Foundation
import TealiumPrism

extension TealiumInstanceManager {
    /// Looks up the `Tealium` instance identified by `key` and invokes `found` with it once
    /// resolved. If no instance exists for `key`, calls `completion(nil, error)` with an
    /// `INSTANCE_NOT_FOUND` error instead of invoking `found`.
    func withInstance(
        _ key: String,
        completion: @escaping (String?, NSError?) -> Void,
        found: @escaping (Tealium) -> Void
    ) {
        get(key) { instance in
            guard let instance else {
                let error = NSError(
                    domain: ErrorCodes.INSTANCE_NOT_FOUND,
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "No Tealium instance with key '\(key)'"]
                )
                completion(nil, error)
                return
            }
            found(instance)
        }
    }
}
