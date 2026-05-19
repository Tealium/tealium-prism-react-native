//
//  ExpiryExtensions.swift
//  TealiumPrismReactNative
//

import TealiumPrism

extension Expiry {

    /// Creates an `Expiry` from the string representation used by the React Native bridge.
    ///
    /// Named variants: `"session"`, `"forever"`, `"untilRestart"`.
    /// Time-based variants (serialized by DataLayerAPI.ts):
    ///   `"afterEpochSeconds:<n>"` → `.after(Date(timeIntervalSince1970: n))`
    /// Unknown strings default to `.forever` and emit a warning log.
    init(rnString: String?) {
        let lower = rnString?.lowercased() ?? ""
        if lower.hasPrefix("afterepochseconds:"),
           let epoch = Double(lower.dropFirst("afterepochseconds:".count)) {
            self = .after(Date(timeIntervalSince1970: epoch))
            return
        }
        switch lower {
        case "session":       self = .session
        case "untilrestart":  self = .untilRestart
        case "forever", "":   self = .forever
        default:
            NSLog("%@ Unknown expiry value '%@', defaulting to forever", bridgeLogTag, rnString ?? "")
            self = .forever
        }
    }
}
