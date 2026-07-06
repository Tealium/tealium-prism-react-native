package com.tealium.prism.reactnative

import android.app.Application
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.tealium.prism.core.BuildConfig as PrismBuildConfig
import com.tealium.prism.core.api.Tealium
import com.tealium.prism.core.api.TealiumConfig
import com.tealium.prism.core.api.data.DataItem
import com.tealium.prism.core.api.data.DataObject
import com.tealium.prism.core.api.logger.LogLevel
import com.tealium.prism.core.api.tracking.DispatchType
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
    val config = buildConfig(account, profile, environment, logLevel)
    // The SDK returns the existing instance (and logs a warning) for a duplicate key.
    return Tealium.create(config).key
  }

  private fun buildConfig(
    account: String,
    profile: String,
    environment: String,
    logLevel: String?
  ): TealiumConfig {
    val application = reactApplicationContext.applicationContext as Application
    val configBuilder = TealiumConfig.Builder(
      application = application,
      accountName = account,
      profileName = profile,
      environment = environment,
      modules = emptyList()
    )

    // TODO: add a conditional check like on Swift when converter will return null for invalid log level string
    logLevel?.let { level ->
      val parsedLevel = LogLevel.Converter.convert(DataItem.string(level))
      configBuilder.configureCoreSettings { settings ->
        settings.setLogLevel(parsedLevel)
      }
    }

    return configBuilder.build()
  }

  override fun track(
    instanceId: String,
    name: String,
    type: String,
    dataJson: String?,
    promise: Promise
  ) {
    Tealium.get(instanceId) { instance ->
      if (instance == null) {
        promise.reject("INSTANCE_NOT_FOUND", "No Tealium instance with key '$instanceId'")
        return@get
      }

      val dispatchType = if (type == "view") DispatchType.View else DispatchType.Event

      val data: DataObject = dataJson?.let {
        DataObject.fromString(it) ?: run {
          promise.reject("DATA_PARSE_ERROR", "Failed to parse data JSON")
          return@get
        }
      } ?: DataObject.EMPTY_OBJECT

      // The subscription is a one-shot: it completes on first emission and the
      // returned Disposable deallocates on its own, so we don't retain it.
      instance.track(name, dispatchType, data).subscribe { result ->
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
    }
  }

  override fun shutdown(instanceId: String, promise: Promise) {
    Tealium.shutdown(instanceId)
    promise.resolve(null)
  }
}
