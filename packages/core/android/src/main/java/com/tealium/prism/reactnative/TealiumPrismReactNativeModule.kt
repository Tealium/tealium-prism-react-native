package com.tealium.prism.reactnative

import android.app.Application
import com.facebook.react.bridge.Arguments
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

    /**
     * Lifecycle tracker for DataLayer subscriptions. Thread-safe because the SDK
     * delivers `register`/event callbacks on arbitrary Tealium threads while JS
     * `unsubscribe`/`shutdown` calls arrive on the module's calling thread.
     */
    private val subscriptions = SubscriptionStore()

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
     * Subscribes to the instance's `onDataUpdated` stream, tagging each emitted
     * delta with [subscriptionId] so JS routes it to a single listener. The
     * registration is async: [markPending] records intent, and once the SDK
     * hands back a [com.tealium.prism.core.api.pubsub.Disposable] it is stored
     * via [SubscriptionStore.register] (or disposed immediately if the
     * subscription was torn down while registering) and [promise] resolves. The
     * stream's completion is wired to [SubscriptionStore.teardown] so an
     * upstream `onComplete` releases the entry without leaking.
     *
     * The lookup's `onNotFound` hook releases the entry [SubscriptionStore.markPending] recorded
     * (see [SubscriptionStore.cancelPending]) before the `INSTANCE_NOT_FOUND` rejection reaches JS.
     */
    override fun dataLayerSubscribeUpdated(
        instanceId: String,
        subscriptionId: String,
        promise: Promise
    ) {
        subscriptions.markPending(subscriptionId, instanceId)
        Tealium.withInstance(
            instanceId,
            promise,
            onNotFound = { subscriptions.cancelPending(subscriptionId, instanceId) }
        ) { instance ->
            val disposable = instance.dataLayer.onDataUpdated.subscribe(
                { data ->
                    emitOnDataUpdated(
                        Arguments.createMap().apply {
                            putString("subscriptionId", subscriptionId)
                            // DataObject.toString() is the SDK's documented JSON serialization.
                            putString("payloadJson", data.toString())
                        }
                    )
                },
                { subscriptions.teardown(subscriptionId) }
            )
            subscriptions.register(subscriptionId, instanceId, disposable)
            promise.resolve(null)
        }
    }

    /** Tears down the subscription for [subscriptionId]; a no-op if unknown. */
    override fun disposeSubscription(subscriptionId: String) {
        subscriptions.teardown(subscriptionId)
    }

    override fun shutdown(instanceId: String, promise: Promise) {
        // Dispose before Tealium.shutdown: the SDK never emits onComplete on
        // shutdown, so the store is what prevents the subscriptions from leaking.
        subscriptions.disposeAllForInstance(instanceId)
        Tealium.shutdown(instanceId)
        promise.resolve(null)
    }

    // Releases SDK subscriptions (and the module they capture) when the React context is
    // destroyed (dev full reload, or a brownfield host recreating the React instance).
    override fun invalidate() {
        super.invalidate()
        subscriptions.disposeAll()
    }
}
