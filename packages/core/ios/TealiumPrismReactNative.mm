#import "TealiumPrismReactNative.h"
#import "TealiumPrismReactNative-Swift.h"

@implementation TealiumPrismReactNative

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeTealiumPrismReactNativeSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"TealiumPrismReactNative";
}

#pragma mark - Core

- (void)getSdkVersion:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
    resolve(TealiumPrismVersion.sdkVersion);
}

- (void)echoJsonValue:(NSString *)input
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
    [TealiumPrismBridge echoJsonValue:input
                           completion:^(NSString * _Nullable result, PromiseRejection * _Nullable rejection) {
        if (rejection) {
            reject(rejection.code, rejection.message, rejection.error);
        } else {
            resolve(result);
        }
    }];
}

- (NSString *)create:(NSString *)account
             profile:(NSString *)profile
         environment:(NSString *)environment
        settingsFile:(NSString * _Nullable)settingsFile
         settingsUrl:(NSString * _Nullable)settingsUrl
            logLevel:(NSString * _Nullable)logLevel
{
    return [TealiumPrismBridge createInstanceWithAccount:account
                                                profile:profile
                                            environment:environment
                                           settingsFile:settingsFile
                                            settingsUrl:settingsUrl
                                               logLevel:logLevel];
}

- (void)track:(NSString *)instanceId
         name:(NSString *)name
         type:(NSString *)type
     dataJson:(NSString * _Nullable)dataJson
      resolve:(RCTPromiseResolveBlock)resolve
       reject:(RCTPromiseRejectBlock)reject
{
    [TealiumPrismBridge trackWithInstanceId:instanceId
                                       name:name
                                       type:type
                                   dataJson:dataJson
                                 completion:^(NSString * _Nullable result, PromiseRejection * _Nullable rejection) {
        if (rejection) {
            reject(rejection.code, rejection.message, rejection.error);
        } else {
            resolve(result);
        }
    }];
}

- (void)shutdown:(NSString *)instanceId
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject
{
    [TealiumPrismBridge shutdownWithInstanceId:instanceId
                                    completion:^{
        resolve(nil);
    }];
}

#pragma mark - Trace

- (void)joinTrace:(NSString *)instanceId
               id:(NSString *)traceId
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject
{
    [TealiumPrismBridge joinTraceWithInstanceId:instanceId
                                             id:traceId
                                     completion:^(NSString * _Nullable result, PromiseRejection * _Nullable rejection) {
        if (rejection) {
            reject(rejection.code, rejection.message, rejection.error);
        } else {
            resolve(result);
        }
    }];
}

- (void)leaveTrace:(NSString *)instanceId
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject
{
    [TealiumPrismBridge leaveTraceWithInstanceId:instanceId
                                      completion:^(NSString * _Nullable result, PromiseRejection * _Nullable rejection) {
        if (rejection) {
            reject(rejection.code, rejection.message, rejection.error);
        } else {
            resolve(result);
        }
    }];
}

- (void)forceEndOfVisit:(NSString *)instanceId
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject
{
    [TealiumPrismBridge forceEndOfVisitWithInstanceId:instanceId
                                           completion:^(NSString * _Nullable result, PromiseRejection * _Nullable rejection) {
        if (rejection) {
            reject(rejection.code, rejection.message, rejection.error);
        } else {
            resolve(result);
        }
    }];
}

#pragma mark - DataLayer

// `expiryEncoded` is optional on the JS side. Codegen represents a nullable `number`
// param as a boxed `NSNumber *` without a `_Nullable` annotation (unlike nullable
// strings), so the generated protocol declares it nonnull even though RN still forwards
// nil for a JS `null`. These signatures have to match the generated protocol exactly;
// the Swift bridge takes the parameter as `NSNumber?` and reads nil as "no expiry".

- (void)dataLayerPutData:(NSString *)instanceId
                dataJson:(NSString *)dataJson
           expiryEncoded:(NSNumber *)expiryEncoded
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject
{
    [TealiumPrismBridge dataLayerPutDataWithInstanceId:instanceId
                                             dataJson:dataJson
                                        expiryEncoded:expiryEncoded
                                           completion:^(NSString * _Nullable result, PromiseRejection * _Nullable rejection) {
        if (rejection) {
            reject(rejection.code, rejection.message, rejection.error);
        } else {
            resolve(result);
        }
    }];
}

- (void)dataLayerPutValue:(NSString *)instanceId
                      key:(NSString *)key
                valueJson:(NSString *)valueJson
            expiryEncoded:(NSNumber *)expiryEncoded
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
    [TealiumPrismBridge dataLayerPutValueWithInstanceId:instanceId
                                                   key:key
                                             valueJson:valueJson
                                         expiryEncoded:expiryEncoded
                                            completion:^(NSString * _Nullable result, PromiseRejection * _Nullable rejection) {
        if (rejection) {
            reject(rejection.code, rejection.message, rejection.error);
        } else {
            resolve(result);
        }
    }];
}

- (void)dataLayerGet:(NSString *)instanceId
                 key:(NSString *)key
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject
{
    [TealiumPrismBridge dataLayerGetWithInstanceId:instanceId
                                              key:key
                                       completion:^(NSString * _Nullable result, PromiseRejection * _Nullable rejection) {
        if (rejection) {
            reject(rejection.code, rejection.message, rejection.error);
        } else {
            // The spec resolves `string | null`. RN maps an ObjC nil to JS
            // `undefined` and only NSNull to JS `null`, so an absent key must
            // resolve NSNull to match Android's `promise.resolve(null)`.
            resolve(result ?: [NSNull null]);
        }
    }];
}

- (void)dataLayerGetAll:(NSString *)instanceId
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject
{
    [TealiumPrismBridge dataLayerGetAllWithInstanceId:instanceId
                                          completion:^(NSString * _Nullable result, PromiseRejection * _Nullable rejection) {
        if (rejection) {
            reject(rejection.code, rejection.message, rejection.error);
        } else {
            resolve(result);
        }
    }];
}

- (void)dataLayerRemove:(NSString *)instanceId
                   keys:(NSArray *)keys
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject
{
    [TealiumPrismBridge dataLayerRemoveWithInstanceId:instanceId
                                                 keys:keys
                                           completion:^(NSString * _Nullable result, PromiseRejection * _Nullable rejection) {
        if (rejection) {
            reject(rejection.code, rejection.message, rejection.error);
        } else {
            resolve(result);
        }
    }];
}

- (void)dataLayerClear:(NSString *)instanceId
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject
{
    [TealiumPrismBridge dataLayerClearWithInstanceId:instanceId
                                         completion:^(NSString * _Nullable result, PromiseRejection * _Nullable rejection) {
        if (rejection) {
            reject(rejection.code, rejection.message, rejection.error);
        } else {
            resolve(result);
        }
    }];
}

@end
