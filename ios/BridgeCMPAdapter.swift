//
//  BridgeCMPAdapter.swift
//  TealiumPrismReactNative
//
//  Bridge CMP adapter that receives consent decisions pushed from JavaScript.
//  Implements the native CMPAdapter protocol, holding a StateSubject that the
//  SDK's consent pipeline subscribes to.
//
//  Persists the last known decision to UserDefaults so consent state survives
//  app restarts without requiring JS to re-push the decision on every launch.
//

import TealiumPrism
import Foundation

internal class BridgeCMPAdapter: CMPAdapter {
    let id: String
    var allPurposes: Set<String>?

    private let defaultDecision: ConsentDecision?
    private let _consentDecision: StateSubject<ConsentDecision?>
    var consentDecision: Observable<ConsentDecision?> { _consentDecision.asObservableState() }

    init(id: String = "react-native-bridge", defaultDecision: ConsentDecision? = nil) {
        self.id = id
        self.defaultDecision = defaultDecision
        let initial = BridgeCMPAdapter.readPersistedDecision(adapterId: id) ?? defaultDecision
        _consentDecision = StateSubject<ConsentDecision?>(initial)
    }

    func update(decision: ConsentDecision) {
        BridgeCMPAdapter.saveDecision(decision, adapterId: id)
        _consentDecision.publish(decision)
    }

    func reset() {
        BridgeCMPAdapter.clearDecision(adapterId: id)
        _consentDecision.publish(defaultDecision)
    }

    var currentDecision: ConsentDecision? {
        _consentDecision.value
    }

    // MARK: - Persistence

    private static func prefixedKey(_ suffix: String, adapterId: String) -> String {
        "com.tealium.prism.rn.consent.\(adapterId).\(suffix)"
    }

    private static func readPersistedDecision(adapterId: String) -> ConsentDecision? {
        let defaults = UserDefaults.standard
        guard let typeString = defaults.string(forKey: prefixedKey("decisionType", adapterId: adapterId)) else {
            return nil
        }
        let type: ConsentDecision.DecisionType = typeString == "explicit" ? .explicit : .implicit
        let purposes = Set(defaults.stringArray(forKey: prefixedKey("purposes", adapterId: adapterId)) ?? [])
        return ConsentDecision(decisionType: type, purposes: purposes)
    }

    private static func saveDecision(_ decision: ConsentDecision, adapterId: String) {
        let defaults = UserDefaults.standard
        defaults.set(
            decision.decisionType == .explicit ? "explicit" : "implicit",
            forKey: prefixedKey("decisionType", adapterId: adapterId)
        )
        defaults.set(Array(decision.purposes), forKey: prefixedKey("purposes", adapterId: adapterId))
    }

    private static func clearDecision(adapterId: String) {
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: prefixedKey("decisionType", adapterId: adapterId))
        defaults.removeObject(forKey: prefixedKey("purposes", adapterId: adapterId))
    }
}
