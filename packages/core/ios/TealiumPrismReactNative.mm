#import "TealiumPrismReactNative.h"

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
    // TealiumConstants.libraryVersion is a Swift-only public constant; it cannot
    // be called from ObjC++. The value is read in TealiumPrismVersion.swift (which
    // imports TealiumPrism and fails to compile if the SDK dep is absent), and
    // kept in sync here as a compile-time constant.
    resolve(@{@"ios": @"0.5.0"});
}

@end
