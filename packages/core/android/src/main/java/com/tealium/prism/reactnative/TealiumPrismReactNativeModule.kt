package com.tealium.prism.reactnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.tealium.prism.core.BuildConfig as PrismBuildConfig
import com.tealium.prism.core.api.data.DataObject
import org.json.JSONObject

class TealiumPrismReactNativeModule(reactContext: ReactApplicationContext) :
  NativeTealiumPrismReactNativeSpec(reactContext) {

  companion object {
    const val NAME = NativeTealiumPrismReactNativeSpec.NAME
  }

  override fun getSdkVersion(promise: Promise) {
    promise.resolve(PrismBuildConfig.TEALIUM_LIBRARY_VERSION)
  }

  override fun echoDataObject(input: String, promise: Promise) {
    try {
      promise.resolve(DataObject.fromJSONObject(JSONObject(input)).toString())
    } catch (e: Exception) {
      promise.reject("ECHO_ERROR", e.message, e)
    }
  }
}
