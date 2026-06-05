//
//  TealiumPrismBridge+DataLayer.swift
//  TealiumPrismReactNative
//

import Foundation
import TealiumPrism

extension TealiumPrismBridge {

    // MARK: - Data Layer

    @objc public func put(record: NSDictionary, expiry: Double, completion: @escaping (Bool, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(
                false,
                NSError(
                    domain: bridgeErrorDomain, code: -1,
                    userInfo: [NSLocalizedDescriptionKey: bridgeErrorNotInitialized]))
            return
        }
        let obj = dataObject(from: record as? [String: Any] ?? [:])
        tealium.dataLayer.put(data: obj, expiry: Expiry(timestamp: Int64(expiry))).subscribe { result in
            switch result {
            case .success: completion(true, nil)
            case .failure(let err): completion(false, err)
            }
        }
    }

    @objc public func getDataItem(key: String, completion: @escaping (Any?, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(
                nil,
                NSError(
                    domain: bridgeErrorDomain, code: -1,
                    userInfo: [NSLocalizedDescriptionKey: bridgeErrorNotInitialized]))
            return
        }
        tealium.dataLayer.getDataItem(key: key).subscribe { result in
            switch result {
            case .success(let dataItem):
                completion(dataItem?.toDataInput(), nil)
            case .failure(let err):
                completion(nil, err)
            }
        }
    }

    @objc public func getDataList(key: String, completion: @escaping (NSArray?, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(
                nil,
                NSError(
                    domain: bridgeErrorDomain, code: -1,
                    userInfo: [NSLocalizedDescriptionKey: bridgeErrorNotInitialized]))
            return
        }
        tealium.dataLayer.getDataArray(key: key).subscribe { result in
            switch result {
            case .success(let array):
                completion(array.map { $0.map { $0.toDataInput() } as NSArray }, nil)
            case .failure(let err):
                completion(nil, err)
            }
        }
    }

    @objc public func getDataObject(key: String, completion: @escaping (NSDictionary?, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(
                nil,
                NSError(
                    domain: bridgeErrorDomain, code: -1,
                    userInfo: [NSLocalizedDescriptionKey: bridgeErrorNotInitialized]))
            return
        }
        tealium.dataLayer.getDataDictionary(key: key).subscribe { result in
            switch result {
            case .success(let dict):
                completion(dict.map { $0.mapValues { $0.toDataInput() } as NSDictionary }, nil)
            case .failure(let err):
                completion(nil, err)
            }
        }
    }

    @objc public func remove(key: String, completion: @escaping (Bool, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(
                false,
                NSError(
                    domain: bridgeErrorDomain, code: -1,
                    userInfo: [NSLocalizedDescriptionKey: bridgeErrorNotInitialized]))
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
                    domain: bridgeErrorDomain, code: -1,
                    userInfo: [NSLocalizedDescriptionKey: bridgeErrorNotInitialized]))
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
                    domain: bridgeErrorDomain, code: -1,
                    userInfo: [NSLocalizedDescriptionKey: bridgeErrorNotInitialized]))
            return
        }
        tealium.dataLayer.clear().subscribe { result in
            switch result {
            case .success: completion(true, nil)
            case .failure(let err): completion(false, err)
            }
        }
    }

    @objc public func getAll(completion: @escaping (NSDictionary?, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(
                nil,
                NSError(
                    domain: bridgeErrorDomain, code: -1,
                    userInfo: [NSLocalizedDescriptionKey: bridgeErrorNotInitialized]))
            return
        }
        tealium.dataLayer.getAll().subscribe { result in
            switch result {
            case .success(let dataObject):
                completion(dataObject.asDictionary() as NSDictionary, nil)
            case .failure(let err):
                completion(nil, err)
            }
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
            let dict = dataObject.asDictionary()
            bridge.onDataUpdated?(dict)
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
            self?.onDataRemoved?(keys)
        }
    }

    @objc public func dataLayerOnDataRemovedDispose() {
        dataRemoveSubscription?.dispose()
        dataRemoveSubscription = nil
    }

}
