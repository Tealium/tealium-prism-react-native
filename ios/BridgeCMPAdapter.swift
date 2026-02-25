//
//  BridgeCMPAdapter.swift
//  TealiumPrismReactNative
//
//  Bridge CMP adapter that receives consent decisions pushed from JavaScript.
//  Implements the native CMPAdapter protocol, holding a StateSubject that the
//  SDK's consent pipeline subscribes to.
//

import TealiumPrism

internal class BridgeCMPAdapter: CMPAdapter {
    let id = "react-native-bridge"
    private let _consentDecision = StateSubject<ConsentDecision?>(nil)
    var consentDecision: Observable<ConsentDecision?> { _consentDecision.asObservableState() }
    var allPurposes: Set<String>?

    func update(decision: ConsentDecision) {
        _consentDecision.publish(decision)
    }

    func reset() {
        _consentDecision.publish(nil)
    }

    var currentDecision: ConsentDecision? {
        _consentDecision.value
    }
}
