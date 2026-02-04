package com.tealiumprismreactnative

import com.facebook.react.bridge.ReactApplicationContext

class TealiumPrismReactNativeModule(reactContext: ReactApplicationContext) :
  NativeTealiumPrismReactNativeSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeTealiumPrismReactNativeSpec.NAME
  }
}
