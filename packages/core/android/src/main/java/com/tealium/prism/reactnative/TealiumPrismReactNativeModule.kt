package com.tealium.prism.reactnative

import com.facebook.react.bridge.ReactApplicationContext

// PR0: empty TurboModule. No Prism methods are bridged yet — this only proves
// the wrapper's native module is linked and registered. Prism APIs arrive in
// later PRs.
class TealiumPrismReactNativeModule(reactContext: ReactApplicationContext) :
  NativeTealiumPrismReactNativeSpec(reactContext) {

  companion object {
    const val NAME = NativeTealiumPrismReactNativeSpec.NAME
  }
}
