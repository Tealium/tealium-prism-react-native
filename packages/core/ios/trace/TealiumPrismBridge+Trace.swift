//
//  TealiumPrismBridge+Trace.swift
//  TealiumPrismReactNative
//

import Foundation
import TealiumPrism

extension TealiumPrismBridge {

    // MARK: - Trace

    @objc public func join(traceId: String, completion: @escaping (Error?) -> Void) {
        guard let tealium = tealium else {
            completion(NSError(domain: bridgeErrorDomain, code: -1, userInfo: [NSLocalizedDescriptionKey: bridgeErrorNotInitialized]))
            return
        }
        tealium.trace.join(id: traceId).subscribe { result in
            switch result {
            case .success: completion(nil)
            case .failure(let err): completion(err)
            }
        }
    }

    @objc public func leave(completion: @escaping (Error?) -> Void) {
        guard let tealium = tealium else {
            completion(NSError(domain: bridgeErrorDomain, code: -1, userInfo: [NSLocalizedDescriptionKey: bridgeErrorNotInitialized]))
            return
        }
        tealium.trace.leave().subscribe { result in
            switch result {
            case .success: completion(nil)
            case .failure(let err): completion(err)
            }
        }
    }

    @objc public func forceEndOfVisit(completion: @escaping (NSDictionary?, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(nil, NSError(domain: bridgeErrorDomain, code: -1,
                userInfo: [NSLocalizedDescriptionKey: bridgeErrorNotInitialized]))
            return
        }
        tealium.trace.forceEndOfVisit().subscribe { result in
            switch result {
            case .success(let trackResult):
                let dispatch = trackResult.dispatch
                let dict: NSDictionary = [
                    "status": trackResult.status == .accepted ? "accepted" : "dropped",
                    "info": trackResult.info,
                    "dispatch": [
                        "id": dispatch.id,
                        "timestamp": dispatch.timestamp,
                        "payload": dispatch.payload.asDictionary(),
                    ] as [String: Any],
                ]
                completion(dict, nil)
            case .failure(let err):
                completion(nil, err)
            }
        }
    }

    // MARK: - Visitor

    @objc public func resetVisitorId(completion: @escaping (String?, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(nil, NSError(domain: bridgeErrorDomain, code: -1, userInfo: [NSLocalizedDescriptionKey: bridgeErrorNotInitialized]))
            return
        }
        tealium.resetVisitorId().subscribe { result in
            switch result {
            case .success(let id): completion(id, nil)
            case .failure(let err): completion(nil, err)
            }
        }
    }

    @objc public func clearStoredVisitorIds(completion: @escaping (String?, Error?) -> Void) {
        guard let tealium = tealium else {
            completion(nil, NSError(domain: bridgeErrorDomain, code: -1, userInfo: [NSLocalizedDescriptionKey: bridgeErrorNotInitialized]))
            return
        }
        tealium.clearStoredVisitorIds().subscribe { result in
            switch result {
            case .success(let id): completion(id, nil)
            case .failure(let err): completion(nil, err)
            }
        }
    }

    // MARK: - Deep Link

    @objc public func handle(url: String, referrer: String?, completion: @escaping (Bool) -> Void) {
        guard let tealium = tealium,
              let deepLinkUrl = URL(string: url) else { completion(false); return }
        let ref: Referrer? = referrer.flatMap { URL(string: $0) }.map { .url($0) }
        tealium.deepLink.handle(link: deepLinkUrl, referrer: ref).subscribe { result in
            switch result {
            case .success: completion(true)
            case .failure: completion(false)
            }
        }
    }
}
