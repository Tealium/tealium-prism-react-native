package com.tealium.prism.reactnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.tealium.prism.core.BuildConfig as PrismBuildConfig

class TealiumPrismReactNativeModule(reactContext: ReactApplicationContext) :
  NativeTealiumPrismReactNativeSpec(reactContext) {

  companion object {
    const val NAME = NativeTealiumPrismReactNativeSpec.NAME
  }

  override fun getSdkVersion(promise: Promise) {
    promise.resolve(PrismBuildConfig.TEALIUM_LIBRARY_VERSION)
  }

  override fun echoJsonValue(input: String, promise: Promise) {
    try {
      promise.resolve(jsonString(dataItem(input)))
    } catch (e: Exception) {
      promise.reject("ECHO_ERROR", e.message, e)
    }
  }
}
