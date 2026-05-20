//
//  TealiumPrismBridge+DataLayer.swift
//  TealiumPrismReactNative
//

import Foundation
import TealiumPrism

extension TealiumPrismBridge {

    // MARK: - Data Layer

    @objc public func put(record: NSDictionary, expiry: String?, completion: @escaping (Bool, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(
                false,
                NSError(
                    domain: "TealiumPrism", code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Not initialized"]))
            return
        }
        let obj = dataObject(from: record as? [String: Any] ?? [:])
        tealium.dataLayer.put(data: obj, expiry: Expiry(rnString: expiry)).subscribe { result in
            switch result {
            case .success: completion(true, nil)
            case .failure(let err): completion(false, err)
            }
        }
    }

    @objc public func getDataItem(key: String, completion: @escaping (NSDictionary?) -> Void) {
        guard let tealium = tealium else {
            NSLog("%@ getDataItem called before initialization", bridgeLogTag)
            completion(nil)
            return
        }
        tealium.dataLayer.getDataItem(key: key).subscribe { result in
            guard case .success(let dataItem) = result, let item = dataItem else {
                completion(nil)
                return
            }
            completion(item.toJSDictionary() as NSDictionary)
        }
    }

    @objc public func getDataList(key: String, completion: @escaping (NSArray?) -> Void) {
        guard let tealium = tealium else {
            NSLog("%@ getDataList called before initialization", bridgeLogTag)
            completion(nil)
            return
        }
        tealium.dataLayer.getDataArray(key: key).subscribe { result in
            guard case .success(let array) = result, let items = array else {
                completion(nil)
                return
            }
            completion(items.map { $0.toJSDictionary() } as NSArray)
        }
    }

    @objc public func getDataObject(key: String, completion: @escaping (NSDictionary?) -> Void) {
        guard let tealium = tealium else {
            NSLog("%@ getDataObject called before initialization", bridgeLogTag)
            completion(nil)
            return
        }
        tealium.dataLayer.getDataDictionary(key: key).subscribe { result in
            guard case .success(let dict) = result, let map = dict else {
                completion(nil)
                return
            }
            completion(map.mapValues { $0.toJSDictionary() } as NSDictionary)
        }
    }

    @objc public func remove(key: String, completion: @escaping (Bool, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(
                false,
                NSError(
                    domain: "TealiumPrism", code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Not initialized"]))
            return
        }
        tealium.dataLayer.remove(key: key).subscribe { result in
            switch result {
            case .success: completion(true, nil)
            case .failure(let err): completion(false, err)
            }
        }
    }

    @objc public func removeKeys(keys: [String], completion: @escaping (Bool, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(
                false,
                NSError(
                    domain: "TealiumPrism", code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Not initialized"]))
            return
        }
        guard !keys.isEmpty else {
            completion(true, nil)
            return
        }
        tealium.dataLayer.remove(keys: keys).subscribe { result in
            switch result {
            case .success: completion(true, nil)
            case .failure(let err): completion(false, err)
            }
        }
    }

    @objc public func clear(completion: @escaping (Bool, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(
                false,
                NSError(
                    domain: "TealiumPrism", code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Not initialized"]))
            return
        }
        tealium.dataLayer.clear().subscribe { result in
            switch result {
            case .success: completion(true, nil)
            case .failure(let err): completion(false, err)
            }
        }
    }

    @objc public func getAll(completion: @escaping (NSDictionary?) -> Void) {
        guard let tealium = tealium else {
            NSLog("%@ getAll called before initialization", bridgeLogTag)
            completion(nil)
            return
        }
        tealium.dataLayer.getAll().subscribe { result in
            guard case .success(let dataObject) = result else {
                if case .failure(let err) = result {
                    NSLog("%@ getAll failed: %@", bridgeLogTag, err.localizedDescription)
                }
                completion(nil)
                return
            }
            completion(dataObject.toRawDict() as NSDictionary)
        }
    }

    // MARK: - DataLayer Events

    @objc public func dataLayerOnDataUpdatedSubscribe() {
        dataLayerOnDataUpdatedDispose()
        guard let tealium = tealium else {
            NSLog("%@ dataLayerOnDataUpdatedSubscribe called before initialization", bridgeLogTag)
            return
        }
        dataUpdateSubscription = tealium.dataLayer.onDataUpdated.subscribe {
            [weak self] dataObject in
            guard let bridge = self else { return }
            let dict = dataObject.toRawDict()
            DispatchQueue.main.async { bridge.onDataUpdated?(dict) }
        }
    }

    @objc public func dataLayerOnDataUpdatedDispose() {
        dataUpdateSubscription?.dispose()
        dataUpdateSubscription = nil
    }

    @objc public func dataLayerOnDataRemovedSubscribe() {
        dataLayerOnDataRemovedDispose()
        guard let tealium = tealium else {
            NSLog("%@ dataLayerOnDataRemovedSubscribe called before initialization", bridgeLogTag)
            return
        }
        dataRemoveSubscription = tealium.dataLayer.onDataRemoved.subscribe { [weak self] keys in
            DispatchQueue.main.async { self?.onDataRemoved?(keys) }
        }
    }

    @objc public func dataLayerOnDataRemovedDispose() {
        dataRemoveSubscription?.dispose()
        dataRemoveSubscription = nil
    }

}
