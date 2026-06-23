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

- (void)getSdkVersion:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
    resolve(TealiumPrismVersion.sdkVersion);
}

- (void)echoDataObject:(NSString *)input
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject
{
    NSError *error = nil;
    NSString *result = [TealiumPrismBridge echoDataObjectFromJSON:input error:&error];
    if (error) {
        reject(@"ECHO_ERROR", error.localizedDescription, error);
    } else {
        resolve(result);
    }
}

@end
