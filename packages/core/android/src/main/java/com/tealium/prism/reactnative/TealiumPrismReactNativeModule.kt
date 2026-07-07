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
import com.tealium.prism.core.api.tracking.TrackResult

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
      promise.reject(ErrorCodes.ECHO_ERROR, e.message, e)
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
    Tealium.withInstance(instanceId, promise) { instance ->
      val dispatchType = if (type == "view") DispatchType.View else DispatchType.Event

      val data: DataObject = dataJson?.let {
        DataObject.fromString(it) ?: run {
          promise.reject(ErrorCodes.DATA_PARSE_ERROR, "Failed to parse data JSON")
          return@withInstance
        }
      } ?: DataObject.EMPTY_OBJECT

      instance.track(name, dispatchType, data).subscribe(promise, ErrorCodes.TRACK_ERROR, converter = ::trackResultAsDataItem)
    }
  }

  private fun trackResultAsDataItem(result: TrackResult): DataItem =
    DataObject.create {
      put("status", result.status.name.lowercase())
      put("info", result.info)
      put("payload", result.dispatch.payload())
    }.asDataItem()

  override fun shutdown(instanceId: String, promise: Promise) {
    Tealium.shutdown(instanceId)
    promise.resolve(null)
  }
}
