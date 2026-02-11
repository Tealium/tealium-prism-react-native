//
//  TealiumPrismBridge.swift
//  TealiumPrismReactNative
//
//  Swift bridge so Objective-C++ .mm can use the Tealium Prism SDK (Swift-only API).
//

import Foundation
import TealiumPrism

private func expiryFromString(_ expiry: String?) -> Expiry {
    switch expiry?.lowercased() {
    case "forever": return .forever
    case "untilrestart": return .untilRestart
    default: return .session
    }
}

private func momentsApiRegionFromString(_ region: String?) -> MomentsAPIRegion? {
    switch region?.lowercased() {
    case "germany": return .germany
    case "us_east": return .usEast
    case "sydney": return .sydney
    case "oregon": return .oregon
    case "tokyo": return .tokyo
    case "hong_kong": return .hongKong
    default: return nil
    }
}

private func dataObject(from dict: [String: Any]) -> DataObject {
    var result = DataObject()
    for (key, value) in dict {
        if let str = value as? String {
            result.set(converting: str, key: key)
        } else if let num = value as? NSNumber {
            result.set(converting: num, key: key)
        } else if let nested = value as? [String: Any] {
            result.set(converting: dataObject(from: nested), key: key)
        } else if let arr = value as? [String] {
            result.set(converting: arr, key: key)
        }
    }
    return result
}

@objc(TealiumPrismBridge)
public class TealiumPrismBridge: NSObject {
    private var tealium: Tealium?
    private var dataUpdateSubscription: (any Disposable)?
    private var dataRemoveSubscription: (any Disposable)?

    // Callback closures for event emission
    @objc public var onDataUpdated: (([String: Any]) -> Void)?
    @objc public var onDataRemoved: (([String]) -> Void)?

    @objc public static let shared = TealiumPrismBridge()

    @objc public func create(
        account: String,
        profile: String,
        environment: String,
        logLevel: String?,
        dataSource: String?,
        settingsFile: String?,
        settingsUrl: String?,
        existingVisitorId: String?,
        visitorIdentityKey: String?,
        momentsApiRegion: String?,
        lifecycleEnabled: Bool,
        completion: @escaping (Bool) -> Void
    ) {
        let minLogLevel = LogLevel.Minimum(from: logLevel) ?? .error

        // Configure modules
        var modules: [any ModuleFactory] = []

        // Add lifecycle module if enabled
        if lifecycleEnabled {
            modules.append(Modules.lifecycle(forcingSettings: nil))
        }

        // Add MomentsAPI module if region is provided
        if let region = momentsApiRegionFromString(momentsApiRegion) {
            modules.append(Modules.momentsAPI(forcingSettings: { $0.setRegion(region) }))
        }

        var config = TealiumConfig(
            account: account,
            profile: profile,
            environment: environment,
            dataSource: dataSource,
            modules: modules,
            settingsFile: settingsFile,
            settingsUrl: settingsUrl,
            forcingSettings: { builder in
                var b = builder.setMinLogLevel(minLogLevel)
                if let key = visitorIdentityKey {
                    b = b.setVisitorIdentityKey(key)
                }
                return b
            }
        )
        config.existingVisitorId = existingVisitorId

        _ = Tealium.create(config: config) { [weak self] result in
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
        tealium = nil
    }

    @objc public func isInitialized() -> Bool {
        tealium != nil
    }

    @objc public func track(name: String, type: String, data: NSDictionary?) {
        guard let tealium = tealium else { return }
        let dispatchType: DispatchType = type.lowercased() == "view" ? .view : .event
        let dataObj = data.map { dataObject(from: $0 as? [String: Any] ?? [:]) }
        _ = tealium.track(name, type: dispatchType, data: dataObj)
    }

    @objc public func flushEventQueue(completion: @escaping () -> Void) {
        guard let tealium = tealium else { completion(); return }
        tealium.flushEventQueue().subscribe { _ in
            DispatchQueue.main.async { completion() }
        }
    }

    // MARK: - Data Layer

    @objc public func setDataLayerString(key: String, value: String, expiry: String?) {
        tealium?.dataLayer.put(key: key, value: value, expiry: expiryFromString(expiry)).subscribe { _ in }
    }

    @objc public func setDataLayerNumber(key: String, value: Double, expiry: String?) {
        tealium?.dataLayer.put(key: key, value: value, expiry: expiryFromString(expiry)).subscribe { _ in }
    }

    @objc public func setDataLayerBoolean(key: String, value: Bool, expiry: String?) {
        tealium?.dataLayer.put(key: key, value: value, expiry: expiryFromString(expiry)).subscribe { _ in }
    }

    @objc public func setDataLayerObject(key: String, value: NSDictionary, expiry: String?) {
        let obj = dataObject(from: value as? [String: Any] ?? [:])
        tealium?.dataLayer.put(key: key, converting: obj, expiry: expiryFromString(expiry)).subscribe { _ in }
    }

    @objc public func setDataLayerStringArray(key: String, value: [String], expiry: String?) {
        tealium?.dataLayer.put(key: key, converting: value, expiry: expiryFromString(expiry)).subscribe { _ in }
    }

    @objc public func getDataLayerString(key: String, completion: @escaping (String?) -> Void) {
        guard let tealium = tealium else { completion(nil); return }
        tealium.dataLayer.get(key: key, as: String.self).subscribe { result in
            DispatchQueue.main.async {
                if case .success(let value) = result { completion(value) }
                else { completion(nil) }
            }
        }
    }

    @objc public func getDataLayerNumber(key: String, completion: @escaping (NSNumber?) -> Void) {
        guard let tealium = tealium else { completion(nil); return }
        tealium.dataLayer.get(key: key, as: Double.self).subscribe { result in
            DispatchQueue.main.async {
                if case .success(let value) = result, let val = value { completion(NSNumber(value: val)) }
                else { completion(nil) }
            }
        }
    }

    @objc public func getDataLayerBoolean(key: String, completion: @escaping (NSNumber?) -> Void) {
        guard let tealium = tealium else { completion(nil); return }
        tealium.dataLayer.get(key: key, as: Bool.self).subscribe { result in
            DispatchQueue.main.async {
                if case .success(let value) = result, let val = value { completion(NSNumber(value: val)) }
                else { completion(nil) }
            }
        }
    }

    @objc public func getDataLayerObject(key: String, completion: @escaping (NSDictionary?) -> Void) {
        guard let tealium = tealium else { completion(nil); return }
        tealium.dataLayer.getDataDictionary(key: key).subscribe { result in
            DispatchQueue.main.async {
                guard case .success(let dict) = result, let d = dict else { completion(nil); return }
                let out = NSMutableDictionary()
                for (k, item) in d {
                    if let str = item.get(as: String.self) { out[k] = str }
                    else if let num = item.get(as: Double.self) { out[k] = num }
                    else if let b = item.get(as: Bool.self) { out[k] = b }
                }
                completion(out)
            }
        }
    }

    @objc public func getDataLayerStringArray(key: String, completion: @escaping ([String]?) -> Void) {
        guard let tealium = tealium else { completion(nil); return }
        tealium.dataLayer.getArray(key: key, of: String.self).subscribe { result in
            DispatchQueue.main.async {
                guard case .success(let arr) = result else { completion(nil); return }
                completion(arr?.compactMap { $0 })
            }
        }
    }

    @objc public func removeDataLayerValue(key: String) {
        tealium?.dataLayer.remove(key: key).subscribe { _ in }
    }

    @objc public func removeDataLayerValues(keys: [String]) {
        tealium?.dataLayer.remove(keys: keys).subscribe { _ in }
    }

    // MARK: - Trace

    @objc public func joinTrace(traceId: String) {
        tealium?.trace.join(id: traceId)
    }

    @objc public func leaveTrace() {
        tealium?.trace.leave()
    }

    // MARK: - Visitor

    @objc public func getVisitorId(completion: @escaping (String?) -> Void) {
        getDataLayerString(key: "tealium_visitor_id", completion: completion)
    }

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

    @objc public func setConsentStatus(_ status: String) {
        setDataLayerString(key: "consent_status", value: status, expiry: "forever")
    }

    @objc public func getConsentStatus(completion: @escaping (String?) -> Void) {
        getDataLayerString(key: "consent_status", completion: completion)
    }

    @objc public func setConsentCategories(_ categories: [String]) {
        setDataLayerStringArray(key: "consent_categories", value: categories, expiry: "forever")
    }

    @objc public func getConsentCategories(completion: @escaping ([String]?) -> Void) {
        getDataLayerStringArray(key: "consent_categories", completion: completion)
    }

    // MARK: - MomentsAPI

    @objc public func fetchEngineResponse(engineId: String, completion: @escaping (NSDictionary?) -> Void) {
        guard let tealium = tealium else { completion(nil); return }
        let momentsApi = tealium.momentsAPI()

        momentsApi.fetchEngineResponse(engineID: engineId).subscribe { result in
            DispatchQueue.main.async {
                guard case .success(let response) = result else {
                    completion(nil)
                    return
                }

                let dict = NSMutableDictionary()

                // Audiences
                if let audiences = response.audiences {
                    dict["audiences"] = audiences
                }

                // Badges
                if let badges = response.badges {
                    dict["badges"] = badges
                }

                // Flags (booleans)
                if let flags = response.flags {
                    dict["flags"] = flags
                }

                // Dates (as milliseconds)
                if let dates = response.dates {
                    var datesDict: [String: Double] = [:]
                    for (key, value) in dates {
                        datesDict[key] = Double(value)
                    }
                    dict["dates"] = datesDict
                }

                // Metrics (numbers)
                if let metrics = response.metrics {
                    dict["metrics"] = metrics
                }

                // Properties (strings)
                if let properties = response.properties {
                    dict["properties"] = properties
                }

                completion(dict)
            }
        }
    }

    // MARK: - Trace (Extended)

    @objc public func forceEndOfVisit() {
        tealium?.trace.forceEndOfVisit()
    }

    // MARK: - Lifecycle (Manual)

    @objc public func lifecycleLaunch(data: NSDictionary?, completion: @escaping () -> Void) {
        guard let tealium = tealium else { completion(); return }
        let lifecycle = tealium.lifecycle()

        let dataObj = data.map { dataObject(from: $0 as? [String: Any] ?? [:]) }
        lifecycle.launch(dataObj).subscribe { _ in
            DispatchQueue.main.async { completion() }
        }
    }

    @objc public func lifecycleWake(data: NSDictionary?, completion: @escaping () -> Void) {
        guard let tealium = tealium else { completion(); return }
        let lifecycle = tealium.lifecycle()

        let dataObj = data.map { dataObject(from: $0 as? [String: Any] ?? [:]) }
        lifecycle.wake(dataObj).subscribe { _ in
            DispatchQueue.main.async { completion() }
        }
    }

    @objc public func lifecycleSleep(data: NSDictionary?, completion: @escaping () -> Void) {
        guard let tealium = tealium else { completion(); return }
        let lifecycle = tealium.lifecycle()

        let dataObj = data.map { dataObject(from: $0 as? [String: Any] ?? [:]) }
        lifecycle.sleep(dataObj).subscribe { _ in
            DispatchQueue.main.async { completion() }
        }
    }

    // MARK: - DataLayer Events

    @objc public func enableDataLayerEvents() {
        guard let tealium = tealium else { return }

        let updateHandler: (DataObject) -> Void = { [weak self] dataObject in
            var dict: [String: Any] = [:]
            for key in dataObject.keys {
                if let str: String = dataObject.get(key: key) {
                    dict[key] = str
                } else if let num: Double = dataObject.get(key: key) {
                    dict[key] = num
                } else if let b: Bool = dataObject.get(key: key) {
                    dict[key] = b
                }
            }
            DispatchQueue.main.async {
                self?.onDataUpdated?(dict)
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
}
