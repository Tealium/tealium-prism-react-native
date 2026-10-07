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
            logLevel:(NSString * _Nullable)logLevel
{
    return [TealiumPrismBridge createInstanceWithAccount:account
                                                profile:profile
                                            environment:environment
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

#pragma mark - Visitor ID

- (void)resetVisitorId:(NSString *)instanceId
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject
{
    [TealiumPrismBridge resetVisitorIdWithInstanceId:instanceId
                                          completion:^(NSString * _Nullable result, PromiseRejection * _Nullable rejection) {
        if (rejection) {
            reject(rejection.code, rejection.message, rejection.error);
        } else {
            resolve(result);
        }
    }];
}

- (void)clearStoredVisitorIds:(NSString *)instanceId
                      resolve:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject
{
    [TealiumPrismBridge clearStoredVisitorIdsWithInstanceId:instanceId
                                                 completion:^(NSString * _Nullable result, PromiseRejection * _Nullable rejection) {
        if (rejection) {
            reject(rejection.code, rejection.message, rejection.error);
        } else {
            resolve(result);
        }
    }];
}

@end
