import Foundation
import TealiumPrism

// TODO: Temporary workaround. `TealiumInstanceManager` keeps only weak references to
// `Tealium` instances, so an instance deallocates (and shuts down) as soon as we drop
// our reference. We make the instance retain itself until shutdown. Remove this once the
// SDK holds strong references to created instances on its own.
private var strongCaptureKey: UInt8 = 0

extension Tealium {
    var strongCapture: Tealium? {
        get { objc_getAssociatedObject(self, &strongCaptureKey) as? Tealium }
        set {
            objc_setAssociatedObject(
                self, &strongCaptureKey, newValue, .OBJC_ASSOCIATION_RETAIN_NONATOMIC
            )
        }
    }
}
