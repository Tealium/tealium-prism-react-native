//
//  ExpiryExtensions.swift
//  TealiumPrismReactNative
//

import TealiumPrism

extension Expiry {

    /// Creates an `Expiry` from the string representation used by the React Native bridge.
    /// Unknown strings default to `.forever` and emit a warning log.
    init(rnString: String?) {
        switch rnString?.lowercased() {
        case "session":       self = .session
        case "untilrestart":  self = .untilRestart
        case "forever", nil:  self = .forever
        default:
            NSLog("%@ Unknown expiry value '%@', defaulting to forever", bridgeLogTag, rnString ?? "")
            self = .forever
        }
    }
}
