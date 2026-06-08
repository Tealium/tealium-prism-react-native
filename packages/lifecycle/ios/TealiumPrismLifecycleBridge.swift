//
//  TealiumPrismLifecycleBridge.swift
//  TealiumPrismLifecycle
//
//  Implements BridgeModule (configure at init time, called before Tealium.create())
//  and provides the runtime launch/wake/sleep API.
//

import Foundation
import TealiumPrism

@objc(TealiumPrismLifecycleBridge)
public class TealiumPrismLifecycleBridge: NSObject, BridgeModule {

    public override init() {
        super.init()
        // Register with the core bridge registry at RN startup —
        // before JS ever calls Tealium.create().
        TealiumPrismBridge.registerBridgeModule(self)
    }

    // MARK: - BridgeModule

    /// Called by TealiumPrismBridge.create() before Tealium.create().
    /// Reads the 'lifecycle' key from jsConfig and adds the Lifecycle module to TealiumConfig.
    public func configure(_ config: inout TealiumConfig, jsConfig: NSDictionary) {
        guard let lc = jsConfig["lifecycle"] as? [String: Any] else { return }
        config.addModule(Modules.lifecycle(forcingSettings: { builder in
            var b = builder
            if let v = lc["autoTracking"] as? Bool {
                b = b.setAutoTrackingEnabled(v)
            }
            if let v = lc["sessionTimeoutInMinutes"] as? Int {
                b = b.setSessionTimeoutInMinutes(v)
            }
            if let v = lc["dataTarget"] as? String,
               let dt = LifecycleDataTarget(rawValue: v) {
                b = b.setDataTarget(dt)
            }
            if let arr = lc["trackedLifecycleEvents"] as? [String] {
                let events = arr.compactMap { LifecycleEvent(rawValue: $0) }
                if !events.isEmpty {
                    b = b.setTrackedLifecycleEvents(events)
                }
            }
            return b
        }))
    }

    // MARK: - Runtime API

    @objc public func lifecycleLaunch(
        _ instanceKey: String,
        data: NSDictionary?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        TealiumInstanceManager.shared.get(instanceKey) { tealium in
            guard let tealium else {
                reject("NOT_INITIALIZED", "Tealium instance '\(instanceKey)' not found", nil)
                return
            }
            let dataObj: DataObject? = (data as? [String: Any]).map { dataObject(from: $0) }
            tealium.lifecycle().launch(dataObj).subscribe { result in
                switch result {
                case .success:
                    resolve(nil)
                case .failure(let e):
                    reject("LIFECYCLE_ERROR", e.localizedDescription, e)
                }
            }
        }
    }

    @objc public func lifecycleWake(
        _ instanceKey: String,
        data: NSDictionary?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        TealiumInstanceManager.shared.get(instanceKey) { tealium in
            guard let tealium else {
                reject("NOT_INITIALIZED", "Tealium instance '\(instanceKey)' not found", nil)
                return
            }
            let dataObj: DataObject? = (data as? [String: Any]).map { dataObject(from: $0) }
            tealium.lifecycle().wake(dataObj).subscribe { result in
                switch result {
                case .success:
                    resolve(nil)
                case .failure(let e):
                    reject("LIFECYCLE_ERROR", e.localizedDescription, e)
                }
            }
        }
    }

    @objc public func lifecycleSleep(
        _ instanceKey: String,
        data: NSDictionary?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        TealiumInstanceManager.shared.get(instanceKey) { tealium in
            guard let tealium else {
                reject("NOT_INITIALIZED", "Tealium instance '\(instanceKey)' not found", nil)
                return
            }
            let dataObj: DataObject? = (data as? [String: Any]).map { dataObject(from: $0) }
            tealium.lifecycle().sleep(dataObj).subscribe { result in
                switch result {
                case .success:
                    resolve(nil)
                case .failure(let e):
                    reject("LIFECYCLE_ERROR", e.localizedDescription, e)
                }
            }
        }
    }
}
