#import "TealiumPrismReactNative.h"
#import <React/RCTEventEmitter.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <TealiumPrismReactNativeSpec/TealiumPrismReactNativeSpec.h>
#endif

// Swift bridge (Xcode-generated header from TealiumPrismBridge.swift)
#import "TealiumPrismReactNative-Swift.h"

static NSString *const kEventDataLayerUpdated = @"TealiumDataLayerUpdated";
static NSString *const kEventDataLayerRemoved = @"TealiumDataLayerRemoved";

@implementation TealiumPrismReactNative {
    BOOL _hasListeners;
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
        if (config.momentsApiRegion()) {
            configDict[@"momentsApiRegion"] = config.momentsApiRegion();
        }

        // Lifecycle (default true)
        configDict[@"lifecycleEnabled"] = @(config.lifecycleEnabled().has_value() ? config.lifecycleEnabled().value() : YES);

        // Consent
        if (config.consentEnabled().has_value()) {
            configDict[@"consentEnabled"] = @(config.consentEnabled().value());
        }
        if (config.consentPurposes().has_value()) {
            auto purposes = config.consentPurposes().value();
            NSMutableArray *purposesArray = [NSMutableArray arrayWithCapacity:purposes.size()];
            for (size_t i = 0; i < purposes.size(); i++) {
                [purposesArray addObject:purposes[i]];
            }
            configDict[@"consentPurposes"] = purposesArray;
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
    [[TealiumPrismBridge shared] trackWithName:name type:type data:dataDict];
    resolve(nil);
}

- (void)flushEventQueue:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(@"NOT_INITIALIZED", @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] flushEventQueueWithCompletion:^{
        resolve(nil);
    }];
}

// MARK: - Data Layer

- (void)setDataLayerString:(NSString *)key
                     value:(NSString *)value
                    expiry:(NSString *)expiry {
    [[TealiumPrismBridge shared] setDataLayerStringWithKey:key value:value expiry:expiry];
}

- (void)setDataLayerNumber:(NSString *)key
                     value:(double)value
                    expiry:(NSString *)expiry {
    [[TealiumPrismBridge shared] setDataLayerNumberWithKey:key value:value expiry:expiry];
}

- (void)setDataLayerBoolean:(NSString *)key
                      value:(BOOL)value
                     expiry:(NSString *)expiry {
    [[TealiumPrismBridge shared] setDataLayerBooleanWithKey:key value:value expiry:expiry];
}

- (void)setDataLayerObject:(NSString *)key
                     value:(NSDictionary *)value
                    expiry:(NSString *)expiry {
    [[TealiumPrismBridge shared] setDataLayerObjectWithKey:key value:value expiry:expiry];
}

- (void)setDataLayerStringArray:(NSString *)key
                          value:(NSArray<NSString *> *)value
                         expiry:(NSString *)expiry {
    [[TealiumPrismBridge shared] setDataLayerStringArrayWithKey:key value:value expiry:expiry];
}

- (void)getDataLayerValue:(NSString *)key
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
    [[TealiumPrismBridge shared] getDataLayerValueWithKey:key completion:^(NSDictionary *result) {
        resolve(result ?: [NSNull null]);
    }];
}

- (void)getDataLayerString:(NSString *)key
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
    [[TealiumPrismBridge shared] getDataLayerStringWithKey:key completion:^(NSString *value) {
        resolve(value ?: [NSNull null]);
    }];
}

- (void)getDataLayerNumber:(NSString *)key
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
    [[TealiumPrismBridge shared] getDataLayerNumberWithKey:key completion:^(NSNumber *value) {
        resolve(value ?: [NSNull null]);
    }];
}

- (void)getDataLayerBoolean:(NSString *)key
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
    [[TealiumPrismBridge shared] getDataLayerBooleanWithKey:key completion:^(NSNumber *value) {
        resolve(value ?: [NSNull null]);
    }];
}

- (void)getDataLayerObject:(NSString *)key
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
    [[TealiumPrismBridge shared] getDataLayerObjectWithKey:key completion:^(NSDictionary *value) {
        resolve(value ?: [NSNull null]);
    }];
}

- (void)getDataLayerStringArray:(NSString *)key
                        resolve:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject {
    [[TealiumPrismBridge shared] getDataLayerStringArrayWithKey:key completion:^(NSArray<NSString *> *value) {
        resolve(value ?: [NSNull null]);
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
    [[TealiumPrismBridge shared] clearDataLayerWithCompletion:^{
        resolve(nil);
    }];
}

- (void)getAllData:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
    [[TealiumPrismBridge shared] getAllDataWithCompletion:^(NSDictionary *data) {
        resolve(data ?: @{});
    }];
}

- (void)dataLayerTransactionalUpdate:(NSArray<NSString *> *)keysToRead
                          operations:(NSArray<NSDictionary *> *)operations
                             resolve:(RCTPromiseResolveBlock)resolve
                              reject:(RCTPromiseRejectBlock)reject {
    [[TealiumPrismBridge shared] dataLayerTransactionalUpdateWithKeysToRead:keysToRead
                                                                 operations:operations
                                                                 completion:^(NSDictionary *result) {
        resolve(result ?: @{});
    }];
}

// MARK: - Deep Link

- (void)handleDeepLink:(NSString *)url
              referrer:(NSString *)referrer
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
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

// MARK: - Visitor / Identity

- (void)resetVisitorId:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
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
    [[TealiumPrismBridge shared] clearStoredVisitorIdsWithCompletion:^(NSString *visitorId, NSError *error) {
        if (error) {
            reject(@"CLEAR_ERROR", error.localizedDescription, error);
        } else {
            resolve(visitorId);
        }
    }];
}

// MARK: - MomentsAPI

- (void)fetchEngineResponse:(NSString *)engineId
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(@"NOT_INITIALIZED", @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] fetchEngineResponseWithEngineId:engineId completion:^(NSDictionary *response) {
        resolve(response ?: [NSNull null]);
    }];
}

// MARK: - Trace (Extended)

- (void)forceEndOfVisit {
    [[TealiumPrismBridge shared] forceEndOfVisit];
}

// MARK: - Lifecycle (Manual)

- (void)lifecycleLaunch:(NSDictionary *)data
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(@"NOT_INITIALIZED", @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] lifecycleLaunchWithData:data completion:^(BOOL success, NSError *error) {
        if (error) {
            reject(@"LIFECYCLE_ERROR", error.localizedDescription, error);
        } else {
            resolve(nil);
        }
    }];
}

- (void)lifecycleWake:(NSDictionary *)data
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(@"NOT_INITIALIZED", @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] lifecycleWakeWithData:data completion:^(BOOL success, NSError *error) {
        if (error) {
            reject(@"LIFECYCLE_ERROR", error.localizedDescription, error);
        } else {
            resolve(nil);
        }
    }];
}

- (void)lifecycleSleep:(NSDictionary *)data
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
    if (![[TealiumPrismBridge shared] isInitialized]) {
        reject(@"NOT_INITIALIZED", @"Tealium is not initialized", nil);
        return;
    }
    [[TealiumPrismBridge shared] lifecycleSleepWithData:data completion:^(BOOL success, NSError *error) {
        if (error) {
            reject(@"LIFECYCLE_ERROR", error.localizedDescription, error);
        } else {
            resolve(nil);
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
    _hasListeners = YES;
}

- (void)removeListeners:(double)count {
    // Keep listeners enabled as long as any remain
}

- (void)startObserving {
    _hasListeners = YES;
}

- (void)stopObserving {
    _hasListeners = NO;
}

@end
