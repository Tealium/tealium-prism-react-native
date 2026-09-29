import Foundation
import TealiumPrism

extension TealiumInstanceManager {
    /// Looks up the `Tealium` instance identified by `key` and invokes `found` with it once
    /// resolved. If no instance exists for `key`, calls `completion(nil, error)` with an
    /// "INSTANCE_NOT_FOUND" error instead of invoking `found`.
    func withInstance(
        _ key: String,
        completion: @escaping (String?, PromiseRejection?) -> Void,
        found: @escaping (Tealium) -> Void
    ) {
        get(key) { instance in
            guard let instance else {
                completion(nil, PromiseRejection(
                    code: .instanceNotFound,
                    message: "No Tealium instance with key '\(key)'")
                )
                return
            }
            found(instance)
        }
    }

    /// Variant of [`TealiumInstanceManager.withInstance(_:completion:found:)`](doc:TealiumInstanceManager/withInstance(_:completion:found:))
    /// for payload-less bridge methods, whose `completion` carries no result string. Delegates to
    /// the other overload with a completion that discards the unused result parameter.
    func withInstance(
        _ key: String,
        completion: @escaping (PromiseRejection?) -> Void,
        found: @escaping (Tealium) -> Void
    ) {
        withInstance(key, completion: { _, rejection in completion(rejection) }, found: found)
    }
}
