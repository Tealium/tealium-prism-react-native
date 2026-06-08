#import "TealiumPrismLifecycle.h"
#import "TealiumPrismLifecycle-Swift.h"

@interface TealiumPrismLifecycle () <NativeTealiumPrismLifecycleSpec>
@property (nonatomic, strong) TealiumPrismLifecycleBridge *lifecycleBridge;
@end

@implementation TealiumPrismLifecycle

RCT_EXPORT_MODULE()

- (instancetype)init {
    self = [super init];
    if (self) {
        _lifecycleBridge = [[TealiumPrismLifecycleBridge alloc] init];
    }
    return self;
}

- (void)lifecycleLaunch:(NSString *)instanceKey
                   data:(NSDictionary *)data
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    [_lifecycleBridge lifecycleLaunch:instanceKey data:data resolve:resolve reject:reject];
}

- (void)lifecycleWake:(NSString *)instanceKey
                 data:(NSDictionary *)data
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
    [_lifecycleBridge lifecycleWake:instanceKey data:data resolve:resolve reject:reject];
}

- (void)lifecycleSleep:(NSString *)instanceKey
                  data:(NSDictionary *)data
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
    [_lifecycleBridge lifecycleSleep:instanceKey data:data resolve:resolve reject:reject];
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeTealiumPrismLifecycleSpecJSI>(params);
}

@end
