#import "TealiumPrismReactNative.h"

// PR0: empty TurboModule. No Prism methods are bridged yet — this only proves
// the wrapper's native module is linked and registered. Prism APIs arrive in
// later PRs.
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

@end
