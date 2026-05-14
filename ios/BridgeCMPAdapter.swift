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

    private static func storageKey(adapterId: String) -> String {
        "com.tealium.prism.rn.consent.\(adapterId)"
    }

    private static func readPersistedDecision(adapterId: String) -> ConsentDecision? {
        guard let dict = UserDefaults.standard.dictionary(forKey: storageKey(adapterId: adapterId)),
              let typeString = dict["decisionType"] as? String else {
            return nil
        }
        let type: ConsentDecision.DecisionType = typeString == "explicit" ? .explicit : .implicit
        let purposes = Set(dict["purposes"] as? [String] ?? [])
        return ConsentDecision(decisionType: type, purposes: purposes)
    }

    private static func saveDecision(_ decision: ConsentDecision, adapterId: String) {
        let dict: [String: Any] = [
            "decisionType": decision.decisionType == .explicit ? "explicit" : "implicit",
            "purposes": Array(decision.purposes)
        ]
        UserDefaults.standard.set(dict, forKey: storageKey(adapterId: adapterId))
    }

    private static func clearDecision(adapterId: String) {
        UserDefaults.standard.removeObject(forKey: storageKey(adapterId: adapterId))
    }
}
