package com.tealium.prism.reactnative

import android.app.Application
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.tealium.prism.core.BuildConfig as PrismBuildConfig
import com.tealium.prism.core.api.Modules
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
            promise.reject(ErrorCode.PRISM_NATIVE_ERROR, e.message, e)
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

        // Enable the Trace module with default (non-null) enforced settings. The registry's default
        // registration uses the null variant, which only instantiates Trace when local/remote
        // settings exist; adding it here makes the module available so the RN-driven join/leave/
        // forceEndOfVisit calls work out of the box. Trace stays inert until join() is called.
        //
        // TODO(next PR): This force-adds Trace for every consumer, unlike the native SDKs where the
        //  app developer opts in via config modules or settings JSON (see the Kotlin/Swift example
        //  apps). Once the wrapper exposes a JS config surface (module registration + per-module
        //  settings such as Trace.setTrackErrors, and settingsFile/settingsUrl), remove this
        //  hardcoded add and let the consumer enable/configure Trace themselves.
        configBuilder.addModule(Modules.trace())

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
                    promise.reject(ErrorCode.DATA_PARSE_ERROR, "Failed to parse data JSON")
                    return@withInstance
                }
            } ?: DataObject.EMPTY_OBJECT

            instance.track(name, dispatchType, data).subscribe(promise, ::trackResultAsDataItem)
        }
    }

    /**
     * Joins the trace [id] on the instance, adding the id to every subsequent dispatch until
     * [leaveTrace] is called or the session expires. Trace.join emits [Unit]; the payload-less
     * result is converted to [DataItem.NULL] so the promise resolves with a JSON `null`.
     */
    override fun joinTrace(instanceId: String, id: String, promise: Promise) {
        Tealium.withInstance(instanceId, promise) { instance ->
            instance.trace.join(id).subscribe(promise) { DataItem.NULL }
        }
    }

    /**
     * Leaves the current trace on the instance. A no-op natively if no trace is joined. Trace.leave
     * emits [Unit]; the payload-less result is converted to [DataItem.NULL] so the promise resolves
     * with a JSON `null`.
     */
    override fun leaveTrace(instanceId: String, promise: Promise) {
        Tealium.withInstance(instanceId, promise) { instance ->
            instance.trace.leave().subscribe(promise) { DataItem.NULL }
        }
    }

    /**
     * Forces the end of the current visit, dispatching a kill-session event. Resolves with the
     * JSON [TrackResult] of that dispatch (via [trackResultAsDataItem]) and rejects natively when
     * no trace is joined.
     */
    override fun forceEndOfVisit(instanceId: String, promise: Promise) {
        Tealium.withInstance(instanceId, promise) { instance ->
            instance.trace.forceEndOfVisit().subscribe(promise, ::trackResultAsDataItem)
        }
    }

    /**
     * Converts a [TrackResult] into the JSON-serializable [DataItem] shape shared with `track`:
     * `status` (lowercased accepted/dropped), `info`, and the dispatch `payload`.
     */
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
