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
    private var tealium: Tealium?
    private var bridgeCMPAdapter: BridgeCMPAdapter?
    private var dataUpdateSubscription: (any Disposable)?
    private var dataRemoveSubscription: (any Disposable)?

    // Callback closures for event emission
    @objc public var onDataUpdated: (([String: Any]) -> Void)?
    @objc public var onDataRemoved: (([String]) -> Void)?

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
               let purposes = config["consentDefaultPurposes"] as? [String] {
                let type: ConsentDecision.DecisionType = typeStr.lowercased() == "explicit" ? .explicit : .implicit
                defaultDecision = ConsentDecision(decisionType: type, purposes: Set(purposes))
            }

            let adapter = BridgeCMPAdapter(id: adapterId, defaultDecision: defaultDecision)
            if let purposes = config["consentPurposes"] as? [String] {
                adapter.allPurposes = Set(purposes)
            }
            tealiumConfig.cmpAdapter = adapter
            self.bridgeCMPAdapter = adapter
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
        // Cleanup data layer event subscriptions
        disableDataLayerEvents()
        onDataUpdated = nil
        onDataRemoved = nil
        bridgeCMPAdapter = nil
        tealium = nil
    }

    @objc public func isInitialized() -> Bool {
        tealium != nil
    }

    // MARK: - Tracking

    @objc public func track(name: String, type: String, data: NSDictionary?, completion: @escaping (Bool, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(false, NSError(domain: "TealiumPrism", code: -1, userInfo: [NSLocalizedDescriptionKey: "Not initialized"]))
            return
        }
        let dispatchType: DispatchType = type.lowercased() == "view" ? .view : .event
        let dataObj = data.map { dataObject(from: $0 as? [String: Any] ?? [:]) }
        tealium.track(name, type: dispatchType, data: dataObj).subscribe { result in
            DispatchQueue.main.async {
                switch result {
                case .success: completion(true, nil)
                case .failure(let err): completion(false, err)
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

    // MARK: - Data Layer

    @objc public func setDataLayerString(key: String, value: String, expiry: String?) {
        guard let tealium = tealium else { return }
        tealium.dataLayer.put(key: key, value: value, expiry: expiryFromString(expiry))
    }

    @objc public func setDataLayerNumber(key: String, value: Double, expiry: String?) {
        guard let tealium = tealium else { return }
        tealium.dataLayer.put(key: key, value: value, expiry: expiryFromString(expiry))
    }

    @objc public func setDataLayerBoolean(key: String, value: Bool, expiry: String?) {
        guard let tealium = tealium else { return }
        tealium.dataLayer.put(key: key, value: value, expiry: expiryFromString(expiry))
    }

    @objc public func setDataLayerObject(key: String, value: NSDictionary, expiry: String?) {
        guard let tealium = tealium else { return }
        let obj = dataObject(from: value as? [String: Any] ?? [:])
        tealium.dataLayer.put(key: key, converting: obj, expiry: expiryFromString(expiry))
    }

    @objc public func setDataLayerStringArray(key: String, value: [String], expiry: String?) {
        guard let tealium = tealium else { return }
        tealium.dataLayer.put(key: key, converting: value, expiry: expiryFromString(expiry))
    }

    @objc public func getDataLayerValue(key: String, completion: @escaping (NSDictionary?) -> Void) {
        guard let tealium = tealium else { completion(nil); return }

        tealium.dataLayer.getDataItem(key: key).subscribe { result in
            DispatchQueue.main.async {
                guard case .success(let dataItem) = result, let item = dataItem else {
                    completion(nil)
                    return
                }
                completion(self.dataItemToDictionary(item) as NSDictionary)
            }
        }
    }

    @objc public func removeDataLayerValue(key: String) {
        guard let tealium = tealium else { return }
        tealium.dataLayer.remove(key: key)
    }

    @objc public func removeDataLayerValues(keys: [String]) {
        guard let tealium = tealium else { return }
        tealium.dataLayer.remove(keys: keys)
    }

    @objc public func clearDataLayer(completion: @escaping (Bool, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(false, NSError(domain: "TealiumPrism", code: -1, userInfo: [NSLocalizedDescriptionKey: "Not initialized"]))
            return
        }
        tealium.dataLayer.clear().subscribe { result in
            DispatchQueue.main.async {
                switch result {
                case .success: completion(true, nil)
                case .failure(let err): completion(false, err)
                }
            }
        }
    }

    @objc public func getAllData(completion: @escaping (NSDictionary?) -> Void) {
        guard let tealium = tealium else { completion(nil); return }
        tealium.dataLayer.getAll().subscribe { result in
            DispatchQueue.main.async {
                guard case .success(let dataObject) = result else {
                    completion(nil)
                    return
                }
                completion(self.dataObjectToDict(dataObject) as NSDictionary)
            }
        }
    }

    // MARK: - Deep Link

    @objc public func handleDeepLink(url: String, referrer: String?, completion: @escaping (Bool) -> Void) {
        guard let tealium = tealium, let deepLinkUrl = URL(string: url) else {
            completion(false)
            return
        }
        let ref: Referrer? = referrer.flatMap { URL(string: $0) }.map { .url($0) }
        tealium.deepLink.handle(link: deepLinkUrl, referrer: ref).subscribe { result in
            DispatchQueue.main.async {
                switch result {
                case .success: completion(true)
                case .failure: completion(false)
                }
            }
        }
    }

    // MARK: - Trace

    @objc public func joinTrace(traceId: String) {
        guard let tealium = tealium else { return }
        tealium.trace.join(id: traceId)
    }

    @objc public func leaveTrace() {
        guard let tealium = tealium else { return }
        tealium.trace.leave()
    }

    @objc public func forceEndOfVisit() {
        guard let tealium = tealium else { return }
        tealium.trace.forceEndOfVisit()
    }

    // MARK: - Visitor

    @objc public func resetVisitorId(completion: @escaping (String?, Error?) -> Void) {
        guard let tealium = tealium else { completion(nil, NSError(domain: "TealiumPrism", code: -1, userInfo: [NSLocalizedDescriptionKey: "Not initialized"])); return }
        tealium.resetVisitorId().subscribe { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let id): completion(id, nil)
                case .failure(let err): completion(nil, err)
                }
            }
        }
    }

    @objc public func clearStoredVisitorIds(completion: @escaping (String?, Error?) -> Void) {
        guard let tealium = tealium else { completion(nil, NSError(domain: "TealiumPrism", code: -1, userInfo: [NSLocalizedDescriptionKey: "Not initialized"])); return }
        tealium.clearStoredVisitorIds().subscribe { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let id): completion(id, nil)
                case .failure(let err): completion(nil, err)
                }
            }
        }
    }

    // MARK: - Consent

    @objc public func setConsentDecision(decisionType: String, purposes: [String]) {
        guard let adapter = bridgeCMPAdapter else { return }
        let type: ConsentDecision.DecisionType = decisionType.lowercased() == "explicit" ? .explicit : .implicit
        let decision = ConsentDecision(decisionType: type, purposes: Set(purposes))
        adapter.update(decision: decision)
    }

    @objc public func getConsentDecision(completion: @escaping (NSDictionary?) -> Void) {
        guard let adapter = bridgeCMPAdapter, let decision = adapter.currentDecision else {
            completion(nil)
            return
        }
        let dict: NSDictionary = [
            "decisionType": decision.decisionType == .explicit ? "explicit" : "implicit",
            "purposes": Array(decision.purposes)
        ]
        completion(dict)
    }

    @objc public func resetConsentDecision() {
        bridgeCMPAdapter?.reset()
    }

    // MARK: - DataLayer Events

    @objc public func enableDataLayerEvents() {
        guard dataUpdateSubscription == nil, let tealium = tealium else { return }

        let updateHandler: (DataObject) -> Void = { [weak self] dataObject in
            guard let bridge = self else { return }
            let dict = bridge.dataObjectToDict(dataObject)
            DispatchQueue.main.async {
                bridge.onDataUpdated?(dict)
            }
        }
        dataUpdateSubscription = tealium.dataLayer.onDataUpdated.subscribe(updateHandler)

        let removeHandler: ([String]) -> Void = { [weak self] keys in
            DispatchQueue.main.async {
                self?.onDataRemoved?(keys)
            }
        }
        dataRemoveSubscription = tealium.dataLayer.onDataRemoved.subscribe(removeHandler)
    }

    @objc public func disableDataLayerEvents() {
        dataUpdateSubscription?.dispose()
        dataRemoveSubscription?.dispose()
        dataUpdateSubscription = nil
        dataRemoveSubscription = nil
    }

    // MARK: - DataLayer Transactional Operations

    @objc public func dataLayerTransactionalUpdate(
        keysToRead: [String],
        operations: [[String: Any]],
        completion: @escaping (NSDictionary?) -> Void
    ) {
        guard let tealium = tealium else {
            completion(nil)
            return
        }

        // If only pre-reading (no operations), just read and return
        if operations.isEmpty && !keysToRead.isEmpty {
            var preReadValues: [String: Any] = [:]
            let group = DispatchGroup()

            for key in keysToRead {
                group.enter()
                tealium.dataLayer.getDataItem(key: key).subscribe { result in
                    if case .success(let item) = result, let dataItem = item,
                       let val = dataItemToAny(dataItem) {
                        preReadValues[key] = val
                    }
                    group.leave()
                }
            }

            group.notify(queue: .main) {
                completion(preReadValues as NSDictionary)
            }
            return
        }

        if !operations.isEmpty {
            tealium.dataLayer.transactionally { apply, _, commit in
                for op in operations {
                    guard let type = op["type"] as? String,
                          let key = op["key"] as? String else { continue }

                    if type == "put" {
                        let expiry = expiryFromString(op["expiry"] as? String)
                        if let value = op["value"] {
                            if let str = value as? String {
                                apply(.put(key: key, value: str, expiry: expiry))
                            } else if let b = value as? Bool {
                                apply(.put(key: key, value: b, expiry: expiry))
                            } else if let num = value as? NSNumber {
                                if CFNumberIsFloatType(num) {
                                    apply(.put(key: key, value: num.doubleValue, expiry: expiry))
                                } else {
                                    apply(.put(key: key, value: num.intValue, expiry: expiry))
                                }
                            } else if let arr = value as? [String] {
                                apply(.put(key: key, value: arr.toDataInput(), expiry: expiry))
                            } else if let dict = value as? [String: Any] {
                                apply(.put(key: key, value: dataObject(from: dict).toDataInput(), expiry: expiry))
                            }
                        }
                    } else if type == "remove" {
                        apply(.remove(key: key))
                    }
                }
                do {
                    try commit()
                } catch {
                    // commit failed - logged by SDK internally
                }
            }.subscribe { _ in
                DispatchQueue.main.async {
                    completion([:] as NSDictionary)
                }
            }
            return
        }

        // Empty call (no keys to read, no operations)
        completion([:] as NSDictionary)
    }

    // MARK: - Helpers

    /// Converts a typed DataItem to a { type, value } dictionary for JS consumption.
    private func dataItemToDictionary(_ item: DataItem) -> [String: Any] {
        if let str = item.get(as: String.self) {
            return ["type": "string", "value": str]
        } else if let b = item.get(as: Bool.self) {
            return ["type": "boolean", "value": b]
        } else if let num = item.get(as: Double.self) {
            return ["type": "number", "value": num]
        } else if let arr = item.getDataArray() {
            return ["type": "list", "value": arr.map { dataItemToDictionary($0) }]
        } else if let dict = item.getDataDictionary() {
            var out: [String: Any] = [:]
            for (k, v) in dict {
                out[k] = dataItemToDictionary(v)
            }
            return ["type": "object", "value": out]
        } else {
            return ["type": "null"]
        }
    }

    /// Unwraps a DataItem to its raw Swift value (used for getAllData / transactional reads).
    private func dataItemToAny(_ item: DataItem) -> Any? {
        if let str = item.get(as: String.self) {
            return str
        } else if let b = item.get(as: Bool.self) {
            return b
        } else if let num = item.get(as: Double.self) {
            return num
        } else if let arr = item.getDataArray() {
            return arr.compactMap { dataItemToAny($0) }
        } else if let dict = item.getDataDictionary() {
            return dict.compactMapValues { dataItemToAny($0) }
        }
        return nil
    }

    private func dataObjectToDict(_ dataObject: DataObject) -> [String: Any] {
        var out: [String: Any] = [:]
        for key in dataObject.keys {
            guard let item = dataObject.getDataItem(key: key) else { continue }
            if let val = dataItemToAny(item) {
                out[key] = val
            }
        }
        return out
    }
}

// MARK: - File-private Helpers

private func expiryFromString(_ expiry: String?) -> Expiry {
    switch expiry?.lowercased() {
    case "forever": return .forever
    case "untilrestart": return .untilRestart
    default: return .session
    }
}

/// Recursively converts an NSDictionary (from JS) into a native DataObject.
private func dataObject(from dict: [String: Any]) -> DataObject {
    var result = DataObject()
    for (key, value) in dict {
        if let str = value as? String {
            result.set(converting: str, key: key)
        } else if let b = value as? Bool {
            result.set(converting: b, key: key)
        } else if let num = value as? NSNumber {
            result.set(converting: num, key: key)
        } else if let nested = value as? [String: Any] {
            result.set(converting: dataObject(from: nested), key: key)
        } else if let arr = value as? [String] {
            result.set(converting: arr, key: key)
        } else if let arr = value as? [NSNumber], let first = arr.first,
                  CFGetTypeID(first) == CFBooleanGetTypeID() {
            result.set(converting: arr.map { $0.boolValue }, key: key)
        } else if let arr = value as? [NSNumber] {
            result.set(converting: arr, key: key)
        } else if let arr = value as? [[String: Any]] {
            let dataObjects = arr.map { dataObject(from: $0) }
            result.set(converting: dataObjects, key: key)
        }
    }
    return result
}
