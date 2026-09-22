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
        settingsFile: String?,
        settingsUrl: String?,
        logLevel: String?
    ): String {
        val config = buildConfig(account, profile, environment, settingsFile, settingsUrl, logLevel)
        // The SDK returns the existing instance (and logs a warning) for a duplicate key.
        return Tealium.create(config).key
    }

    private fun buildConfig(
        account: String,
        profile: String,
        environment: String,
        settingsFile: String?,
        settingsUrl: String?,
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

        // An unrecognized log level string converts to null; mirror Swift and leave
        // the setting unconfigured rather than forcing a fallback level.
        logLevel?.let { level ->
            LogLevel.Converter.convert(DataItem.string(level))?.let { parsedLevel ->
                configBuilder.configureCoreSettings { settings ->
                    settings.setLogLevel(parsedLevel)
                }
            }
        }

        // Local (asset) and remote settings sources. Precedence is enforced by the
        // SDK: local < remote < programmatic. Omitted sources stay unconfigured.
        settingsFile?.let { configBuilder.setSettingsFile(it) }
        settingsUrl?.let { configBuilder.setSettingsUrl(it) }

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

    /**
     * Stores every key-value pair of [dataJson] in the instance's data layer, expiring them
     * according to [expiryEncoded] (see [resolveExpiry]). An [expiryEncoded] value the SDK's
     * converter cannot decode falls back to the SDK's no-expiry overload (forever), the same as
     * an omitted value. DataLayer.put emits [Unit]; the payload-less result is converted to
     * [DataItem.NULL] so the promise resolves with a JSON `null`.
     */
    override fun dataLayerPutData(
        instanceId: String,
        dataJson: String,
        expiryEncoded: Double?,
        promise: Promise
    ) {
        Tealium.withInstance(instanceId, promise) { instance ->
            val data = DataObject.fromString(dataJson) ?: run {
                promise.reject(ErrorCode.DATA_PARSE_ERROR, "Failed to parse data JSON")
                return@withInstance
            }

            val expiry = resolveExpiry(expiryEncoded)
            val put = if (expiry == null) {
                instance.dataLayer.put(data)
            } else {
                instance.dataLayer.put(data, expiry)
            }
            put.subscribe(promise) { DataItem.NULL }
        }
    }

    /**
     * Stores [valueJson] under [key] in the instance's data layer, expiring it according to
     * [expiryEncoded] (see [resolveExpiry]). An [expiryEncoded] value the SDK's converter cannot
     * decode falls back to the SDK's no-expiry overload (forever), the same as an omitted value.
     * DataLayer.put emits [Unit]; the payload-less result is converted to [DataItem.NULL] so the
     * promise resolves with a JSON `null`.
     */
    override fun dataLayerPutValue(
        instanceId: String,
        key: String,
        valueJson: String,
        expiryEncoded: Double?,
        promise: Promise
    ) {
        Tealium.withInstance(instanceId, promise) { instance ->
            // DataItem.parse yields DataItem.NULL for unparseable JSON rather than throwing; the
            // catch covers values the SDK rejects as unsupported.
            val value = try {
                dataItem(valueJson)
            } catch (e: Exception) {
                promise.reject(ErrorCode.DATA_PARSE_ERROR, "Failed to parse value JSON", e)
                return@withInstance
            }

            val expiry = resolveExpiry(expiryEncoded)
            val put = if (expiry == null) {
                instance.dataLayer.put(key, value)
            } else {
                instance.dataLayer.put(key, value, expiry)
            }
            put.subscribe(promise) { DataItem.NULL }
        }
    }

    /**
     * Reads the value stored under [key]. The SDK emits `null` only for an absent key (a stored
     * JSON `null` comes back as [DataItem.NULL]), so the promise resolves with a real `null` for an
     * absent key and with the value's JSON string — `"null"` for a stored null — otherwise.
     */
    override fun dataLayerGet(instanceId: String, key: String, promise: Promise) {
        Tealium.withInstance(instanceId, promise) { instance ->
            instance.dataLayer.get(key).subscribeNullable(promise) { it }
        }
    }

    /** Reads every entry of the instance's data layer as a single JSON object. */
    override fun dataLayerGetAll(instanceId: String, promise: Promise) {
        Tealium.withInstance(instanceId, promise) { instance ->
            instance.dataLayer.getAll().subscribe(promise)
        }
    }

    /**
     * Removes the keys listed in [keysJson] (always a JSON array of strings) from the instance's
     * data layer. DataLayer.remove emits [Unit]; the payload-less result is converted to
     * [DataItem.NULL] so the promise resolves with a JSON `null`.
     */
    override fun dataLayerRemove(instanceId: String, keysJson: String, promise: Promise) {
        Tealium.withInstance(instanceId, promise) { instance ->
            val keys = parseKeys(keysJson) ?: run {
                promise.reject(
                    ErrorCode.DATA_PARSE_ERROR,
                    "Failed to parse keys JSON: expected a JSON array of strings"
                )
                return@withInstance
            }

            instance.dataLayer.remove(keys).subscribe(promise) { DataItem.NULL }
        }
    }

    /**
     * Removes every entry from the instance's data layer. DataLayer.clear emits [Unit]; the
     * payload-less result is converted to [DataItem.NULL] so the promise resolves with a JSON
     * `null`.
     */
    override fun dataLayerClear(instanceId: String, promise: Promise) {
        Tealium.withInstance(instanceId, promise) { instance ->
            instance.dataLayer.clear().subscribe(promise) { DataItem.NULL }
        }
    }

    override fun shutdown(instanceId: String, promise: Promise) {
        Tealium.shutdown(instanceId)
        promise.resolve(null)
    }
}
