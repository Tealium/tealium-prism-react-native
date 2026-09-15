#import <TealiumPrismReactNativeSpec/TealiumPrismReactNativeSpec.h>

// Subclass the codegen-generated base so we inherit the typed `emitOn…:`
// methods for the EventEmitters declared in the TS spec
// (e.g. `emitOnDataUpdated:` for the `onDataUpdated` EventEmitter).
@interface TealiumPrismReactNative : NativeTealiumPrismReactNativeSpecBase <NativeTealiumPrismReactNativeSpec>

@end
