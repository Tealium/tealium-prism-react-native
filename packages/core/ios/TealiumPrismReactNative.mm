#import "TealiumPrismReactNative.h"
#import <React/RCTEventEmitter.h>

// Swift bridge (Xcode-generated header from TealiumPrismBridge.swift)
#import "TealiumPrismReactNative-Swift.h"

static NSString *const kEventDataLayerUpdated = @"TealiumDataLayerUpdated";
static NSString *const kEventDataLayerRemoved = @"TealiumDataLayerRemoved";
static NSString *const kEventConsentDecisionChanged = @"TealiumConsentDecisionChanged";

static NSString *const kErrorNotInitialized    = @"NOT_INITIALIZED";
static NSString *const kErrorInit              = @"INIT_ERROR";
static NSString *const kErrorTrack             = @"TRACK_ERROR";
static NSString *const kErrorFlush             = @"FLUSH_ERROR";
static NSString *const kErrorDataLayer         = @"DATA_LAYER_ERROR";
static NSString *const kErrorTrace             = @"TRACE_ERROR";
static NSString *const kErrorReset             = @"RESET_ERROR";
static NSString *const kErrorClear             = @"CLEAR_ERROR";
static NSString *const kErrorConsentNotEnabled = @"CONSENT_NOT_ENABLED";

@implementation TealiumPrismReactNative

// MARK: - Module Setup

+ (NSString *)moduleName {
    return @"TealiumPrismReactNative";
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeTealiumPrismReactNativeSpecJSI>(params);
}

// MARK: - Initialization & Lifecycle

- (void)initialize:(JS::NativeTealiumPrismReactNative::TealiumConfigSpec &)config
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
    @try {
        TealiumPrismBridge *bridge = [TealiumPrismBridge shared];

        // Build config dictionary from spec
        NSMutableDictionary *configDict = [NSMutableDictionary dictionary];

        // Required parameters
        configDict[@"account"] = config.account();
        configDict[@"profile"] = config.profile();
        configDict[@"environment"] = config.environment();

        // Optional parameters
        if (config.logLevel()) {
            configDict[@"logLevel"] = config.logLevel();
        }
        if (config.dataSource()) {
            configDict[@"dataSource"] = config.dataSource();
        }
        if (config.settingsFile()) {
            configDict[@"settingsFile"] = config.settingsFile();
        }
        if (config.settingsUrl()) {
            configDict[@"settingsUrl"] = config.settingsUrl();
        }
        if (config.existingVisitorId()) {
            configDict[@"existingVisitorId"] = config.existingVisitorId();
        }
        if (config.visitorIdentityKey()) {
            configDict[@"visitorIdentityKey"] = config.visitorIdentityKey();
        }
        // Consent adapter (nested object from JS)
        if (auto cmpAdapterOpt = config.cmpAdapter(); cmpAdapterOpt.has_value()) {
            auto cmpAdapter = cmpAdapterOpt.value();
            if (cmpAdapter.id_()) {
                configDict[@"consentAdapterId"] = cmpAdapter.id_();
            }
            auto allPurposes = cmpAdapter.allPurposes();
            if (allPurposes.has_value()) {
                NSMutableArray *purposes = [NSMutableArray array];
                for (NSString *purpose : allPurposes.value()) {
                    [purposes addObject:purpose];
                }
                configDict[@"consentPurposes"] = purposes;
            }
            if (cmpAdapter.defaultDecisionType()) {
                configDict[@"consentDefaultDecisionType"] = cmpAdapter.defaultDecisionType();
            }
            auto defaultPurposes = cmpAdapter.defaultPurposes();
            if (defaultPurposes.has_value()) {
                NSMutableArray *defaults = [NSMutableArray array];
                for (NSString *purpose : defaultPurposes.value()) {
                    [defaults addObject:purpose];
                }
                configDict[@"consentDefaultPurposes"] = defaults;
            }
        }

        // Consent configuration (purpose mapping for enableConsentIntegration builder)
        if (auto consentCfgOpt = config.consentConfiguration(); consentCfgOpt.has_value()) {
            auto consentCfg = consentCfgOpt.value();
            NSMutableDictionary *consentDict = [NSMutableDictionary dictionary];
            if (consentCfg.tealiumPurposeId()) {
                consentDict[@"tealiumPurposeId"] = consentCfg.tealiumPurposeId();
            }
            auto purposesOpt = consentCfg.purposes();
            if (purposesOpt.has_value()) {
                NSMutableArray *purposesArr = [NSMutableArray array];
                auto lazyArray = purposesOpt.value();
                for (size_t i = 0; i < lazyArray.size(); i++) {
                    auto purpose = lazyArray[i];
                    NSMutableDictionary *purposeDict = [NSMutableDictionary dictionary];
                    if (purpose.purposeId()) {
                        purposeDict[@"purposeId"] = purpose.purposeId();
                    }
                    NSMutableArray *dispatcherIds = [NSMutableArray array];
                    for (NSString *did : purpose.dispatcherIds()) {
                        [dispatcherIds addObject:did];
                    }
                    purposeDict[@"dispatcherIds"] = dispatcherIds;
                    [purposesArr addObject:purposeDict];
                }
                consentDict[@"purposes"] = purposesArr;
            }
            auto refireOpt = consentCfg.refireDispatcherIds();
            if (refireOpt.has_value()) {
                NSMutableArray *refireArr = [NSMutableArray array];
                for (NSString *rd : refireOpt.value()) {
                    [refireArr addObject:rd];
                }
                consentDict[@"refireDispatcherIds"] = refireArr;
            }
            configDict[@"consentConfiguration"] = consentDict;
        }

        // Core Settings (optional)
        if (config.maxQueueSize().has_value()) {
            configDict[@"maxQueueSize"] = @(config.maxQueueSize().value());
        }
        if (config.queueExpirationSeconds().has_value()) {
            configDict[@"queueExpirationSeconds"] = @(config.queueExpirationSeconds().value());
        }
        if (config.refreshIntervalSeconds().has_value()) {
            configDict[@"refreshIntervalSeconds"] = @(config.refreshIntervalSeconds().value());
        }
        if (config.sessionTimeoutSeconds().has_value()) {
            configDict[@"sessionTimeoutSeconds"] = @(config.sessionTimeoutSeconds().value());
        }

        [bridge createWithConfig:configDict completion:^(BOOL success, NSError *error) {
            if (error) {
                reject(kErrorInit, error.localizedDescription ?: @"Initialization failed", error);
            } else {
                resolve(@YES);
            }
        }];
    } @catch (NSException *exception) {
        reject(kErrorInit, exception.reason, nil);
    }
}

- (void)shutdown:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject {
    [[TealiumPrismBridge shared] shutdownWithCompletion:^{
        resolve(nil);
    }];
}

- (void)isInitialized:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
    resolve(@([[TealiumPrismBridge shared] isInitialized]));
}

// MARK: - Tracking

- (void)track:(JS::NativeTealiumPrismReactNative::TrackDataSpec &)trackData
      resolve:(RCTPromiseResolveBlock)resolve
       reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(kErrorNotInitialized, @"Tealium is not initialized", nil);
        return;
    }
    NSString *name = trackData.name();
    NSString *type = trackData.type() ?: @"event";
    NSDictionary *dataDict = trackData.data() ? (NSDictionary *)trackData.data() : nil;
    [[TealiumPrismBridge shared] trackWithName:name type:type data:dataDict completion:^(NSDictionary *result, NSError *error) {
        if (error) {
            reject(kErrorTrack, error.localizedDescription ?: @"Track dispatch failed", error);
        } else {
            resolve(result);
        }
    }];
}

- (void)flushEventQueue:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(kErrorNotInitialized, @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] flushEventQueueWithCompletion:^(BOOL success, NSError *error) {
        if (!success || error) {
            reject(kErrorFlush, error.localizedDescription ?: @"Flush event queue failed", error);
        } else {
            resolve(nil);
        }
    }];
}

// MARK: - Data Layer

- (void)dataLayerPut:(NSDictionary *)record
              expiry:(double)expiry
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(kErrorNotInitialized, @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] putWithRecord:record expiry:expiry completion:^(BOOL success, NSError *error) {
        if (error) {
            reject(kErrorDataLayer, error.localizedDescription, error);
        } else {
            resolve(nil);
        }
    }];
}

- (void)dataLayerGetDataItem:(NSString *)key
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(kErrorNotInitialized, @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] getDataItemWithKey:key completion:^(NSDictionary *result, NSError *error) {
        if (error) {
            reject(kErrorDataLayer, error.localizedDescription, error);
        } else {
            resolve(result ?: [NSNull null]);
        }
    }];
}

- (void)dataLayerGetDataList:(NSString *)key
                     resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(kErrorNotInitialized, @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] getDataListWithKey:key completion:^(NSArray *result, NSError *error) {
        if (error) {
            reject(kErrorDataLayer, error.localizedDescription, error);
        } else {
            resolve(result ?: [NSNull null]);
        }
    }];
}

- (void)dataLayerGetDataObject:(NSString *)key
                       resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(kErrorNotInitialized, @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] getDataObjectWithKey:key completion:^(NSDictionary *result, NSError *error) {
        if (error) {
            reject(kErrorDataLayer, error.localizedDescription, error);
        } else {
            resolve(result ?: [NSNull null]);
        }
    }];
}

- (void)dataLayerRemove:(NSString *)key
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(kErrorNotInitialized, @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] removeWithKey:key completion:^(BOOL success, NSError *error) {
        if (error) {
            reject(kErrorDataLayer, error.localizedDescription, error);
        } else {
            resolve(nil);
        }
    }];
}

- (void)dataLayerRemoveKeys:(NSArray<NSString *> *)keys
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(kErrorNotInitialized, @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] removeKeysWithKeys:keys completion:^(BOOL success, NSError *error) {
        if (error) {
            reject(kErrorDataLayer, error.localizedDescription, error);
        } else {
            resolve(nil);
        }
    }];
}

- (void)dataLayerClear:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(kErrorNotInitialized, @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] clearWithCompletion:^(BOOL success, NSError *error) {
        if (error) {
            reject(kErrorDataLayer, error.localizedDescription, error);
        } else {
            resolve(nil);
        }
    }];
}

- (void)dataLayerGetAll:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(kErrorNotInitialized, @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] getAllWithCompletion:^(NSDictionary *data, NSError *error) {
        if (error) {
            reject(kErrorDataLayer, error.localizedDescription, error);
        } else {
            resolve(data ?: @{});
        }
    }];
}

// MARK: - Deep Link

- (void)deepLinkHandle:(NSString *)url
              referrer:(NSString *)referrer
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(kErrorNotInitialized, @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] handleWithUrl:url referrer:referrer completion:^(BOOL success) {
        resolve(@(success));
    }];
}

// MARK: - Trace

- (void)traceJoin:(NSString *)traceId
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(kErrorNotInitialized, @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] joinWithTraceId:traceId completion:^(NSError *error) {
        if (error) { reject(kErrorTrace, error.localizedDescription, error); }
        else { resolve(nil); }
    }];
}

- (void)traceLeave:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(kErrorNotInitialized, @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] leaveWithCompletion:^(NSError *error) {
        if (error) { reject(kErrorTrace, error.localizedDescription, error); }
        else { resolve(nil); }
    }];
}

- (void)traceForceEndOfVisit:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(kErrorNotInitialized, @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] forceEndOfVisitWithCompletion:^(NSDictionary *result, NSError *error) {
        if (error) {
            reject(kErrorTrace, error.localizedDescription ?: @"Force end of visit failed", error);
        } else {
            resolve(result);
        }
    }];
}

// MARK: - Visitor / Identity

- (void)resetVisitorId:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(kErrorNotInitialized, @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] resetVisitorIdWithCompletion:^(NSString *visitorId, NSError *error) {
        if (error) {
            reject(kErrorReset, error.localizedDescription, error);
        } else {
            resolve(visitorId);
        }
    }];
}

- (void)clearStoredVisitorIds:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(kErrorNotInitialized, @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] clearStoredVisitorIdsWithCompletion:^(NSString *visitorId, NSError *error) {
        if (error) {
            reject(kErrorClear, error.localizedDescription, error);
        } else {
            resolve(visitorId);
        }
    }];
}

// MARK: - Consent

- (void)consentSetDecision:(NSString *)decisionType
                  purposes:(NSArray<NSString *> *)purposes
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
    [[TealiumPrismBridge shared] setDecisionWithDecisionType:decisionType purposes:purposes completion:^(BOOL success, NSError *error) {
        if (error) {
            NSString *code = error.userInfo[@"TealiumBridgeErrorCode"] ?: kErrorConsentNotEnabled;
            reject(code, error.localizedDescription, error);
        } else {
            resolve(nil);
        }
    }];
}

- (void)consentGetDecision:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
    [[TealiumPrismBridge shared] getDecisionWithCompletion:^(NSDictionary *result) {
        resolve(result ?: [NSNull null]);
    }];
}

- (void)consentReset:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
    [[TealiumPrismBridge shared] resetWithCompletion:^(BOOL success, NSError *error) {
        if (error) {
            reject(kErrorConsentNotEnabled, error.localizedDescription, error);
        } else {
            resolve(nil);
        }
    }];
}

- (void)consentGetAllPurposes:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject {
    [[TealiumPrismBridge shared] getAllPurposesWithCompletion:^(NSArray<NSString *> *purposes) {
        resolve(purposes ?: [NSNull null]);
    }];
}

- (void)consentOnDecisionChangedSubscribe {
    __weak TealiumPrismReactNative *weakSelf = self;
    TealiumPrismBridge *bridge = [TealiumPrismBridge shared];
    bridge.onConsentDecisionChanged = ^(NSDictionary<NSString *, id> *decision) {
        TealiumPrismReactNative *strongSelf = weakSelf;
        if (strongSelf) {
            [strongSelf sendEventWithName:kEventConsentDecisionChanged
                                     body:@{@"decision": decision ?: [NSNull null]}];
        }
    };
    [bridge consentOnDecisionChangedSubscribe];
}

- (void)consentOnDecisionChangedDispose {
    TealiumPrismBridge *bridge = [TealiumPrismBridge shared];
    [bridge consentOnDecisionChangedDispose];
    bridge.onConsentDecisionChanged = nil;
}

// MARK: - DataLayer Events

- (void)dataLayerOnDataUpdatedSubscribe {
    __weak TealiumPrismReactNative *weakSelf = self;
    TealiumPrismBridge *bridge = [TealiumPrismBridge shared];
    bridge.onDataUpdated = ^(NSDictionary<NSString *, id> *data) {
        TealiumPrismReactNative *strongSelf = weakSelf;
        if (strongSelf) {
            [strongSelf sendEventWithName:kEventDataLayerUpdated body:data];
        }
    };
    [bridge dataLayerOnDataUpdatedSubscribe];
}

- (void)dataLayerOnDataUpdatedDispose {
    TealiumPrismBridge *bridge = [TealiumPrismBridge shared];
    [bridge dataLayerOnDataUpdatedDispose];
    bridge.onDataUpdated = nil;
}

- (void)dataLayerOnDataRemovedSubscribe {
    __weak TealiumPrismReactNative *weakSelf = self;
    TealiumPrismBridge *bridge = [TealiumPrismBridge shared];
    bridge.onDataRemoved = ^(NSArray<NSString *> *keys) {
        TealiumPrismReactNative *strongSelf = weakSelf;
        if (strongSelf) {
            [strongSelf sendEventWithName:kEventDataLayerRemoved body:@{@"keys": keys}];
        }
    };
    [bridge dataLayerOnDataRemovedSubscribe];
}

- (void)dataLayerOnDataRemovedDispose {
    TealiumPrismBridge *bridge = [TealiumPrismBridge shared];
    [bridge dataLayerOnDataRemovedDispose];
    bridge.onDataRemoved = nil;
}

// MARK: - Event Emitter Support

- (NSArray<NSString *> *)supportedEvents {
    return @[kEventDataLayerUpdated, kEventDataLayerRemoved, kEventConsentDecisionChanged];
}

- (void)addListener:(NSString *)eventType {}

- (void)removeListeners:(double)count {}

// In bridgeless New Architecture mode (RN 0.73+), RCTEventEmitter.receiveEvent() is not
// registered as a callable JS module. Override to route through RCTDeviceEventEmitter.emit()
// instead, which is always registered in both bridge and bridgeless modes.
// No _hasListeners guard needed: the subscribe/dispose lifecycle in DataLayerAPI.ts stops
// the native SDK from generating events when no JS listeners exist. Any in-flight event
// from the race window is silently dropped by RCTDeviceEventEmitter when no subscribers are registered.
- (void)sendEventWithName:(NSString *)eventName body:(id)body {
    // callableJSModules is id — message send to nil is safe (no-op) in ObjC.
    [self.callableJSModules invokeModule:@"RCTDeviceEventEmitter"
                                   method:@"emit"
                                 withArgs:@[eventName, body ?: [NSNull null]]];
}

@end
