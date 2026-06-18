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

@end
