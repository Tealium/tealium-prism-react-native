//
//  TealiumPrismBridge+Consent.swift
//  TealiumPrismReactNative
//

import Foundation
import TealiumPrism

// MARK: - Consent serialization

private enum ConsentSerializationKeys {
    static let decisionType = "decisionType"
    static let purposes     = "purposes"
}

extension ConsentDecision {
    func toDictionary() -> [String: Any] {
        [
            ConsentSerializationKeys.decisionType: decisionType.rawValue.lowercased(),
            ConsentSerializationKeys.purposes: Array(purposes)
        ]
    }
}

extension TealiumPrismBridge {

    // MARK: - Consent

    @objc public func setDecision(decisionType: String, purposes: [String]) {
        guard let adapter = bridgeCMPAdapter,
              let type = ConsentDecision.DecisionType(rawValue: decisionType.lowercased()) else { return }
        adapter.update(decision: ConsentDecision(decisionType: type, purposes: Set(purposes)))
    }

    @objc public func getDecision(completion: @escaping (NSDictionary?) -> Void) {
        guard let decision = bridgeCMPAdapter?.currentDecision else {
            completion(nil)
            return
        }
        completion(decision.toDictionary() as NSDictionary)
    }

    @objc public func reset() {
        bridgeCMPAdapter?.reset()
    }

    @objc public func getAllPurposes(completion: @escaping (NSArray?) -> Void) {
        guard let purposes = bridgeCMPAdapter?.allPurposes else {
            completion(nil)
            return
        }
        completion(Array(purposes) as NSArray)
    }

    // MARK: - Consent Events

    @objc public func consentOnDecisionChangedSubscribe() {
        consentOnDecisionChangedDispose()
        guard let adapter = bridgeCMPAdapter else {
            NSLog("%@ consentOnDecisionChangedSubscribe called before initialization", bridgeLogTag)
            return
        }
        consentDecisionSubscription = adapter.consentDecision.subscribe { [weak self] decision in
            guard let bridge = self else { return }
            let dict = decision?.toDictionary()
            DispatchQueue.main.async { bridge.onConsentDecisionChanged?(dict) }
        }
    }

    @objc public func consentOnDecisionChangedDispose() {
        consentDecisionSubscription?.dispose()
        consentDecisionSubscription = nil
    }
}
