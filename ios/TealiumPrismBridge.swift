//
//  TealiumPrismBridge.swift
//  TealiumPrismReactNative
//
//  Swift bridge so Objective-C++ .mm can use the Tealium Prism SDK (Swift-only API).
//

import Foundation
import TealiumPrism

// TODO: addBarrier() — requires native BarrierFactory objects, cannot be serialized as JS config
// TODO: addLoadRule() — requires native Rule<Condition> objects, cannot be serialized as JS config
// TODO: addTransformation() — requires native TransformationSettings objects, cannot be serialized as JS config
// TODO: Lifecycle module — will be a separate tealium-prism-lifecycle-react-native package
// TODO: MomentsAPI module — will be a separate tealium-prism-moments-api-react-native package

@objc(TealiumPrismBridge)
public class TealiumPrismBridge: NSObject {
    var tealium: Tealium?
    var bridgeCMPAdapter: BridgeCMPAdapter?
    var dataUpdateSubscription: (any Disposable)?
    var dataRemoveSubscription: (any Disposable)?
    var consentDecisionSubscription: (any Disposable)?

    // Callback closures for event emission
    @objc public var onDataUpdated: (([String: Any]) -> Void)?
    @objc public var onDataRemoved: (([String]) -> Void)?
    @objc public var onConsentDecisionChanged: (([String: Any]?) -> Void)?

    @objc public static let shared = TealiumPrismBridge()

    // MARK: - Lifecycle

    /// Creates a Tealium instance from a configuration dictionary.
    /// This approach allows easy extension without changing method signatures.
    @objc public func create(
        config: NSDictionary,
        completion: @escaping (Bool) -> Void
    ) {
        // Required parameters
        guard let account = config["account"] as? String,
              let profile = config["profile"] as? String,
              let environment = config["environment"] as? String else {
            completion(false)
            return
        }

        // Optional parameters
        let logLevel = config["logLevel"] as? String
        let dataSource = config["dataSource"] as? String
        let settingsFile = config["settingsFile"] as? String
        let settingsUrl = config["settingsUrl"] as? String
        let existingVisitorId = config["existingVisitorId"] as? String
        let visitorIdentityKey = config["visitorIdentityKey"] as? String

        // Core Settings
        let minLogLevel = logLevel.flatMap { LogLevel.Minimum(from: $0) }
        let maxQueueSize = config["maxQueueSize"] as? Int
        let queueExpirationSeconds = config["queueExpirationSeconds"] as? Int
        let refreshIntervalSeconds = config["refreshIntervalSeconds"] as? Int
        let sessionTimeoutSeconds = config["sessionTimeoutSeconds"] as? Int

        let hasAnyCoreSetting = minLogLevel != nil || visitorIdentityKey != nil
            || maxQueueSize != nil || queueExpirationSeconds != nil
            || refreshIntervalSeconds != nil || sessionTimeoutSeconds != nil

        let coreSettingsBlock: ((CoreSettingsBuilder) -> CoreSettingsBuilder)? = hasAnyCoreSetting
            ? { builder in
                var b = builder
                if let level = minLogLevel             { b = b.setMinLogLevel(level) }
                if let key = visitorIdentityKey        { b = b.setVisitorIdentityKey(key) }
                if let size = maxQueueSize             { b = b.setMaxQueueSize(size) }
                if let exp = queueExpirationSeconds    { b = b.setQueueExpiration(Int64(exp).seconds) }
                if let ref = refreshIntervalSeconds    { b = b.setRefreshInterval(Int64(ref).seconds) }
                if let timeout = sessionTimeoutSeconds { b = b.setSessionTimeout(Int64(timeout).seconds) }
                return b
            }
            : nil

        var tealiumConfig = TealiumConfig(
            account: account,
            profile: profile,
            environment: environment,
            dataSource: dataSource,
            modules: [],
            settingsFile: settingsFile,
            settingsUrl: settingsUrl,
            forcingSettings: coreSettingsBlock
        )
        tealiumConfig.existingVisitorId = existingVisitorId

        // Configure consent if consentAdapterId is present
        if let adapterId = config["consentAdapterId"] as? String {
            var defaultDecision: ConsentDecision? = nil
            if let typeStr = config["consentDefaultDecisionType"] as? String,
               let type = ConsentDecision.DecisionType(rawValue: typeStr.lowercased()),
               let purposes = config["consentDefaultPurposes"] as? [String] {
                defaultDecision = ConsentDecision(decisionType: type, purposes: Set(purposes))
            }

            let adapter = BridgeCMPAdapter(id: adapterId, defaultDecision: defaultDecision)
            if let purposes = config["consentPurposes"] as? [String] {
                adapter.allPurposes = Set(purposes)
            }
            self.bridgeCMPAdapter = adapter

            // Use enableConsentIntegration when programmatic consentConfiguration provided.
            // Otherwise direct cmpAdapter assignment — purpose mapping must come from settings JSON.
            if let consentCfg = config["consentConfiguration"] as? [String: Any],
               let purposeId = consentCfg["tealiumPurposeId"] as? String {
                tealiumConfig.enableConsentIntegration(with: adapter) { builder in
                    var b = builder.setTealiumPurposeId(purposeId)
                    if let purposes = consentCfg["purposes"] as? [[String: Any]] {
                        for purpose in purposes {
                            if let purposeId = purpose["purposeId"] as? String,
                               let dispatcherIds = purpose["dispatcherIds"] as? [String] {
                                b = b.addPurpose(purposeId, dispatcherIds: dispatcherIds)
                            }
                        }
                    }
                    if let refire = consentCfg["refireDispatcherIds"] as? [String] {
                        b = b.setRefireDispatchersIds(refire)
                    }
                    return b
                }
            } else {
                tealiumConfig.cmpAdapter = adapter
            }
        }

        _ = Tealium.create(config: tealiumConfig) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let instance):
                    self?.tealium = instance
                    completion(true)
                case .failure:
                    self?.tealium = nil
                    completion(false)
                }
            }
        }
    }

    @objc public func shutdown() {
        dataLayerOnDataUpdatedDispose()
        dataLayerOnDataRemovedDispose()
        consentOnDecisionChangedDispose()
        onDataUpdated = nil
        onDataRemoved = nil
        onConsentDecisionChanged = nil
        bridgeCMPAdapter = nil
        tealium = nil
    }

    @objc public func isInitialized() -> Bool {
        tealium != nil
    }

    // MARK: - Tracking

    @objc public func track(name: String, type: String, data: NSDictionary?, completion: @escaping (NSDictionary?, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(nil, NSError(domain: "TealiumPrism", code: -1, userInfo: [NSLocalizedDescriptionKey: "Not initialized"]))
            return
        }
        let dispatchType: DispatchType = type.lowercased() == "view" ? .view : .event
        let dataObj = data.map { dataObject(from: $0 as? [String: Any] ?? [:]) }
        tealium.track(name, type: dispatchType, data: dataObj).subscribe { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let trackResult):
                    let dispatch = trackResult.dispatch
                    let dict: NSDictionary = [
                        "status": trackResult.status == .accepted ? "accepted" : "dropped",
                        "info": trackResult.info,
                        "dispatch": [
                            "id": dispatch.id,
                            "timestamp": dispatch.timestamp,
                            "payload": dispatch.payload.toRawDict(),
                        ] as [String: Any],
                    ]
                    completion(dict, nil)
                case .failure(let err):
                    completion(nil, err)
                }
            }
        }
    }

    @objc public func flushEventQueue(completion: @escaping (Bool, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(false, NSError(domain: "TealiumPrism", code: -1, userInfo: [NSLocalizedDescriptionKey: "Not initialized"]))
            return
        }
        tealium.flushEventQueue().subscribe { result in
            DispatchQueue.main.async {
                switch result {
                case .success: completion(true, nil)
                case .failure(let err): completion(false, err)
                }
            }
        }
    }
}
