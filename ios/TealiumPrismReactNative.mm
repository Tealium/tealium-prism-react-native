#import "TealiumPrismReactNative.h"
#import <React/RCTEventEmitter.h>

// Swift bridge (Xcode-generated header from TealiumPrismBridge.swift)
#import "TealiumPrismReactNative-Swift.h"

static NSString *const kEventDataLayerUpdated = @"TealiumDataLayerUpdated";
static NSString *const kEventDataLayerRemoved = @"TealiumDataLayerRemoved";

@implementation TealiumPrismReactNative {
    BOOL _hasListeners;
    NSInteger _listenerCount;
}

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
        NSDictionary *cmpAdapter = (NSDictionary *)config.cmpAdapter();
        if (cmpAdapter) {
            if (cmpAdapter[@"id"]) {
                configDict[@"consentAdapterId"] = cmpAdapter[@"id"];
            }
            if (cmpAdapter[@"allPurposes"]) {
                configDict[@"consentPurposes"] = cmpAdapter[@"allPurposes"];
            }
            if (cmpAdapter[@"defaultDecisionType"]) {
                configDict[@"consentDefaultDecisionType"] = cmpAdapter[@"defaultDecisionType"];
            }
            if (cmpAdapter[@"defaultPurposes"]) {
                configDict[@"consentDefaultPurposes"] = cmpAdapter[@"defaultPurposes"];
            }
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

        [bridge createWithConfig:configDict completion:^(BOOL success) {
            resolve(success ? @YES : @NO);
        }];
    } @catch (NSException *exception) {
        reject(@"INIT_ERROR", exception.reason, nil);
    }
}

- (void)shutdown {
    [[TealiumPrismBridge shared] shutdown];
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
        reject(@"NOT_INITIALIZED", @"Tealium is not initialized", nil);
        return;
    }
    NSString *name = trackData.name();
    NSString *type = trackData.type() ?: @"event";
    NSDictionary *dataDict = trackData.data() ? (NSDictionary *)trackData.data() : nil;
    [[TealiumPrismBridge shared] trackWithName:name type:type data:dataDict completion:^(BOOL success, NSError *error) {
        if (!success || error) {
            reject(@"TRACK_ERROR", error.localizedDescription ?: @"Track dispatch failed", error);
        } else {
            resolve(nil);
        }
    }];
}

- (void)flushEventQueue:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(@"NOT_INITIALIZED", @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] flushEventQueueWithCompletion:^(BOOL success, NSError *error) {
        if (!success || error) {
            reject(@"FLUSH_ERROR", error.localizedDescription ?: @"Flush event queue failed", error);
        } else {
            resolve(nil);
        }
    }];
}

// MARK: - Data Layer

- (void)setDataLayer:(NSDictionary *)record
              expiry:(NSString *)expiry {
    [[TealiumPrismBridge shared] setDataLayerWithRecord:record expiry:expiry];
}

- (void)getDataLayerValue:(NSString *)key
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(@"NOT_INITIALIZED", @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] getDataLayerValueWithKey:key completion:^(NSDictionary *result) {
        resolve(result ?: [NSNull null]);
    }];
}

- (void)removeDataLayerValue:(NSString *)key {
    [[TealiumPrismBridge shared] removeDataLayerValueWithKey:key];
}

- (void)removeDataLayerValues:(NSArray<NSString *> *)keys {
    [[TealiumPrismBridge shared] removeDataLayerValuesWithKeys:keys];
}

- (void)clearDataLayer:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(@"NOT_INITIALIZED", @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] clearDataLayerWithCompletion:^(BOOL success, NSError *error) {
        if (error) {
            reject(@"DATA_LAYER_ERROR", error.localizedDescription, error);
        } else {
            resolve(nil);
        }
    }];
}

- (void)getAllData:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(@"NOT_INITIALIZED", @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] getAllDataWithCompletion:^(NSDictionary *data) {
        resolve(data ?: @{});
    }];
}

- (void)dataLayerTransactionalUpdate:(NSArray<NSString *> *)keysToRead
                          operations:(NSArray<NSDictionary *> *)operations
                             resolve:(RCTPromiseResolveBlock)resolve
                              reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(@"NOT_INITIALIZED", @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] dataLayerTransactionalUpdateWithKeysToRead:keysToRead
                                                                 operations:operations
                                                                 completion:^(NSDictionary *result, NSError *error) {
        if (error) {
            reject(@"TRANSACTION_ERROR", error.localizedDescription, error);
        } else {
            resolve(result ?: @{});
        }
    }];
}

// MARK: - Deep Link

- (void)handleDeepLink:(NSString *)url
              referrer:(NSString *)referrer
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(@"NOT_INITIALIZED", @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] handleDeepLinkWithUrl:url referrer:referrer completion:^(BOOL success) {
        resolve(@(success));
    }];
}

// MARK: - Trace

- (void)joinTrace:(NSString *)traceId {
    [[TealiumPrismBridge shared] joinTraceWithTraceId:traceId];
}

- (void)leaveTrace {
    [[TealiumPrismBridge shared] leaveTrace];
}

- (void)forceEndOfVisit {
    [[TealiumPrismBridge shared] forceEndOfVisit];
}

// MARK: - Visitor / Identity

- (void)resetVisitorId:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(@"NOT_INITIALIZED", @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] resetVisitorIdWithCompletion:^(NSString *visitorId, NSError *error) {
        if (error) {
            reject(@"RESET_ERROR", error.localizedDescription, error);
        } else {
            resolve(visitorId);
        }
    }];
}

- (void)clearStoredVisitorIds:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(@"NOT_INITIALIZED", @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] clearStoredVisitorIdsWithCompletion:^(NSString *visitorId, NSError *error) {
        if (error) {
            reject(@"CLEAR_ERROR", error.localizedDescription, error);
        } else {
            resolve(visitorId);
        }
    }];
}

// MARK: - Consent

- (void)setConsentDecision:(NSString *)decisionType
                  purposes:(NSArray<NSString *> *)purposes {
    [[TealiumPrismBridge shared] setConsentDecisionWithDecisionType:decisionType purposes:purposes];
}

- (void)getConsentDecision:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
    [[TealiumPrismBridge shared] getConsentDecisionWithCompletion:^(NSDictionary *result) {
        resolve(result ?: [NSNull null]);
    }];
}

- (void)resetConsentDecision {
    [[TealiumPrismBridge shared] resetConsentDecision];
}

// MARK: - DataLayer Events

- (void)enableDataLayerEvents {
    __weak TealiumPrismReactNative *weakSelf = self;

    TealiumPrismBridge *bridge = [TealiumPrismBridge shared];
    bridge.onDataUpdated = ^(NSDictionary<NSString *, id> *data) {
        TealiumPrismReactNative *strongSelf = weakSelf;
        if (strongSelf && strongSelf->_hasListeners) {
            [strongSelf sendEventWithName:kEventDataLayerUpdated body:data];
        }
    };
    bridge.onDataRemoved = ^(NSArray<NSString *> *keys) {
        TealiumPrismReactNative *strongSelf = weakSelf;
        if (strongSelf && strongSelf->_hasListeners) {
            [strongSelf sendEventWithName:kEventDataLayerRemoved body:@{@"keys": keys}];
        }
    };

    [bridge enableDataLayerEvents];
}

- (void)disableDataLayerEvents {
    TealiumPrismBridge *bridge = [TealiumPrismBridge shared];
    bridge.onDataUpdated = nil;
    bridge.onDataRemoved = nil;
    [bridge disableDataLayerEvents];
}

// MARK: - Event Emitter Support

- (NSArray<NSString *> *)supportedEvents {
    return @[kEventDataLayerUpdated, kEventDataLayerRemoved];
}

- (void)addListener:(NSString *)eventType {
    _listenerCount++;
    _hasListeners = YES;
}

- (void)removeListeners:(double)count {
    _listenerCount = MAX(0, _listenerCount - (NSInteger)count);
    if (_listenerCount == 0) {
        _hasListeners = NO;
    }
}

// In bridgeless New Architecture mode (RN 0.73+), RCTEventEmitter.receiveEvent() is not
// registered as a callable JS module. Override to route through RCTDeviceEventEmitter.emit()
// instead, which is always registered in both bridge and bridgeless modes.
- (void)sendEventWithName:(NSString *)eventName body:(id)body {
    if (!_hasListeners) {
        return;
    }
    // callableJSModules is id — message send to nil is safe (no-op) in ObjC.
    [self.callableJSModules invokeModule:@"RCTDeviceEventEmitter"
                                   method:@"emit"
                                 withArgs:@[eventName, body ?: [NSNull null]]];
}

@end
