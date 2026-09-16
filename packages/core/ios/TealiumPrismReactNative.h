#import <TealiumPrismReactNativeSpec/TealiumPrismReactNativeSpec.h>
#import <React/RCTInvalidating.h>

// Subclass the codegen-generated base so we inherit the typed `emitOn…:`
// methods for the EventEmitters declared in the TS spec
// (e.g. `emitOnDataUpdated:` for the `onDataUpdated` EventEmitter).
//
// Conforms to RCTInvalidating so RCTTurboModuleManager calls `invalidate` on
// JS runtime teardown (dev full reload, or a brownfield host recreating the
// React instance), disposing every tracked native subscription.
@interface TealiumPrismReactNative : NativeTealiumPrismReactNativeSpecBase <NativeTealiumPrismReactNativeSpec, RCTInvalidating>

@end
