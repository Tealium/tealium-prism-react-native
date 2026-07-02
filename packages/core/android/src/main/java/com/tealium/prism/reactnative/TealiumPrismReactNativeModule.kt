package com.tealium.prism.reactnative

import android.app.Application
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.tealium.prism.core.BuildConfig as PrismBuildConfig
import com.tealium.prism.core.api.data.DataObject
import com.tealium.prism.core.api.tracking.DispatchType
import com.tealium.prism.core.api.tracking.TrackResult
import org.json.JSONObject

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

  override fun create(
    account: String,
    profile: String,
    environment: String,
    logLevel: String?
  ): String {
    val application = reactApplicationContext.applicationContext as Application
    return TealiumPrismInstanceRegistry.create(
      application, account, profile, environment, logLevel
    )
  }

  override fun track(
    instanceId: String,
    name: String,
    type: String,
    dataJson: String?,
    promise: Promise
  ) {
    val instance = TealiumPrismInstanceRegistry.getTealiumInstance(instanceId)
    val disposables = TealiumPrismInstanceRegistry.getDisposables(instanceId)
    if (instance == null || disposables == null) {
      promise.reject("INSTANCE_NOT_FOUND", "No Tealium instance with key '$instanceId'")
      return
    }

    val dispatchType = if (type == "view") DispatchType.View else DispatchType.Event

    val data: DataObject = dataJson?.let {
      DataObject.fromString(it) ?: run {
        promise.reject("DATA_PARSE_ERROR", "Failed to parse data JSON")
        return
      }
    } ?: DataObject.EMPTY_OBJECT

    val disposable = instance.track(name, dispatchType, data).subscribe { result ->
      result
        .onSuccess { trackResult ->
          try {
            val json = JSONObject().apply {
              put("status", trackResult.status.name.lowercase())
              put("info", trackResult.info)
              put("payload", JSONObject(trackResult.dispatch.payload().toString()))
            }.toString()
            promise.resolve(json)
          } catch (e: Exception) {
            promise.reject("SERIALIZATION_ERROR", "Failed to serialize TrackResult: ${e.message}", e)
          }
        }
        .onFailure { error ->
          promise.reject("TRACK_ERROR", error.message, error as? Exception)
        }
    }
    disposables.add(disposable)
  }

  override fun shutdown(instanceId: String, promise: Promise) {
    TealiumPrismInstanceRegistry.remove(instanceId)
    promise.resolve(null)
  }
}
