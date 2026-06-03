package com.tealiumprismreactnative

import android.app.Application
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.tealium.prism.core.api.Modules
import com.tealium.prism.core.api.Tealium
import com.tealium.prism.core.api.TealiumConfig
import com.tealium.prism.core.api.consent.ConsentDecision
import com.tealium.prism.core.api.data.DataObject
import com.tealium.prism.core.api.modules.ModuleFactory
import com.tealiumprismreactnative.bridge.toStringSet
import com.tealiumprismreactnative.consent.BridgeCmpAdapter
import com.tealiumprismreactnative.datalayer.toWritableMap
import com.tealiumprismreactnative.consent.ConsentDelegate
import com.tealiumprismreactnative.datalayer.DataLayerDelegate
import com.tealiumprismreactnative.trace.TraceDelegate
import com.tealium.prism.core.api.logger.LogLevel
import com.tealium.prism.core.api.misc.Environment
import com.tealium.prism.core.api.misc.TimeFrameUtils.seconds
import com.tealium.prism.core.api.tracking.DispatchType

// TODO: addBarrier() — requires native BarrierFactory objects, cannot be serialized as JS config
// TODO: addLoadRule() — requires native Rule<Condition> objects, cannot be serialized as JS config
// TODO: addTransformation() — requires native TransformationSettings objects, cannot be serialized as JS config
// TODO: setLogHandler() — custom native log handler callback, difficult to bridge from JS
// TODO: Lifecycle module — will be a separate tealium-prism-lifecycle-react-native package
// TODO: MomentsAPI module — will be a separate tealium-prism-moments-api-react-native package
class TealiumPrismReactNativeModule(reactContext: ReactApplicationContext) :
    NativeTealiumPrismReactNativeSpec(reactContext) {

    companion object {
        const val NAME = NativeTealiumPrismReactNativeSpec.NAME
        const val EVENT_DATA_LAYER_UPDATED = "TealiumDataLayerUpdated"
        const val EVENT_DATA_LAYER_REMOVED = "TealiumDataLayerRemoved"
        const val EVENT_CONSENT_DECISION_CHANGED = "TealiumConsentDecisionChanged"
    }

    private var tealium: Tealium? = null
    private var bridgeCmpAdapter: BridgeCmpAdapter? = null

    private val dataLayer = DataLayerDelegate(getTealium = { tealium }, sendEvent = ::sendEvent)
    private val consent = ConsentDelegate(getAdapter = { bridgeCmpAdapter }, sendEvent = ::sendEvent)
    private val trace = TraceDelegate(getTealium = { tealium })

    // ============================================
    // Initialization & Lifecycle
    // ============================================

    override fun initialize(config: ReadableMap, promise: Promise) {
        try {
            val application = getApplication() ?: run {
                promise.reject(ERROR_INIT, "Application context unavailable")
                return
            }

            val account = config.getString("account") ?: run {
                promise.reject(ERROR_INIT, "Account is required"); return
            }
            val profile = config.getString("profile") ?: run {
                promise.reject(ERROR_INIT, "Profile is required"); return
            }
            val environmentStr = config.getString("environment") ?: run {
                promise.reject(ERROR_INIT, "Environment is required"); return
            }

            val environment = when (environmentStr) {
                "prod" -> Environment.PROD
                "qa" -> Environment.QA
                else -> Environment.DEV
            }

            // Default factories registered by Modules.defaultModules pass null
            // enforcedSettings, meaning trace/deepLink only initialize if local
            // or remote settings provide them. JS callers expect these always
            // available, so register them explicitly with default settings.
            val configBuilder = TealiumConfig.Builder(
                application = application,
                modules = listOf(
                    Modules.trace(),
                    Modules.deepLink()
                ),
                accountName = account,
                profileName = profile,
                environment = environment
            )

            configBuilder.configureCoreSettings { settings ->
                config.getString("logLevel")?.let { logLevelStr ->
                    val logLevel = when (logLevelStr) {
                        "trace" -> LogLevel.TRACE
                        "debug" -> LogLevel.DEBUG
                        "info" -> LogLevel.INFO
                        "warn" -> LogLevel.WARN
                        "error" -> LogLevel.ERROR
                        "silent" -> LogLevel.SILENT
                        else -> LogLevel.ERROR
                    }
                    settings.setLogLevel(logLevel)
                }
                config.getString("visitorIdentityKey")?.let { settings.setVisitorIdentityKey(it) }
                if (config.hasKey("maxQueueSize")) settings.setMaxQueueSize(config.getInt("maxQueueSize"))
                if (config.hasKey("queueExpirationSeconds")) settings.setExpiration(config.getInt("queueExpirationSeconds").seconds)
                if (config.hasKey("refreshIntervalSeconds")) settings.setRefreshInterval(config.getInt("refreshIntervalSeconds").seconds)
                if (config.hasKey("sessionTimeoutSeconds")) settings.setSessionTimeout(config.getInt("sessionTimeoutSeconds").seconds)
                settings
            }

            config.getString("settingsFile")?.let { configBuilder.setSettingsFile(it) }
            config.getString("settingsUrl")?.let { configBuilder.setSettingsUrl(it) }
            config.getString("dataSource")?.let { configBuilder.setDataSource(it) }
            config.getString("existingVisitorId")?.let { configBuilder.setExistingVisitorId(it) }

            if (config.hasKey("cmpAdapter")) {
                val cmpAdapterMap = config.getMap("cmpAdapter")
                if (cmpAdapterMap != null) {
                    // The adapter ID must match the ConsentConfiguration key in
                    // settings JSON; there is no safe default, so require it.
                    val adapterId = cmpAdapterMap.getString("id")
                    if (adapterId.isNullOrEmpty()) {
                        promise.reject(ERROR_INIT, "cmpAdapter.id is required"); return
                    }

                    var defaultDecision: ConsentDecision? = null
                    if (cmpAdapterMap.hasKey("defaultDecisionType") && cmpAdapterMap.hasKey("defaultPurposes")) {
                        val typeStr = cmpAdapterMap.getString("defaultDecisionType")
                        val purposesArray = cmpAdapterMap.getArray("defaultPurposes")
                        if (typeStr != null && purposesArray != null) {
                            val type = ConsentDecision.DecisionType.entries
                                .firstOrNull { it.name.equals(typeStr, ignoreCase = true) }
                            if (type != null) {
                                defaultDecision = ConsentDecision(type, purposesArray.toStringSet())
                            } else {
                                Log.w(TAG, "Unknown defaultDecisionType '$typeStr' — skipping consent default")
                            }
                        }
                    }

                    val adapter = BridgeCmpAdapter(application, adapterId, defaultDecision)
                    cmpAdapterMap.getArray("allPurposes")?.let { arr ->
                        adapter.allPurposes = arr.toStringSet()
                    }
                    bridgeCmpAdapter = adapter

                    // Use 2-arg enableConsentIntegration when programmatic consentConfiguration
                    // provided. Otherwise plain adapter — purpose mapping comes from settings JSON.
                    val consentCfgMap = config.getMap("consentConfiguration")
                    val purposeId = consentCfgMap?.getString("tealiumPurposeId")
                    if (consentCfgMap != null && purposeId != null) {
                        configBuilder.enableConsentIntegration(adapter) { builder ->
                            builder.setTealiumPurposeId(purposeId)
                            consentCfgMap.getArray("purposes")?.let { purposesArr ->
                                for (i in 0 until purposesArr.size()) {
                                    val p = purposesArr.getMap(i) ?: continue
                                    val purposeId = p.getString("purposeId") ?: continue
                                    val dispIds = p.getArray("dispatcherIds")?.toStringSet() ?: continue
                                    builder.addPurpose(purposeId, dispIds)
                                }
                            }
                            consentCfgMap.getArray("refireDispatcherIds")?.toStringSet()?.let {
                                builder.setRefireDispatcherIds(it)
                            }
                            builder
                        }
                    } else {
                        configBuilder.enableConsentIntegration(adapter)
                    }
                }
            }

            Tealium.create(configBuilder.build()) { result ->
                tealium = result.getOrNull()
                if (result.isSuccess) {
                    promise.resolve(true)
                } else {
                    val err = result.exceptionOrNull()
                    promise.reject(ERROR_INIT, err?.message ?: "Initialization failed", err)
                }
            }

        } catch (e: Exception) {
            promise.reject(ERROR_INIT, e.message, e)
        }
    }

    override fun shutdown(promise: Promise) {
        dataLayer.onDataUpdatedDispose()
        dataLayer.onDataRemovedDispose()
        consent.onDecisionChangedDispose()
        tealium?.shutdown()
        tealium = null
        bridgeCmpAdapter = null
        promise.resolve(null)
    }

    override fun isInitialized(promise: Promise) {
        promise.resolve(tealium != null)
    }

    // ============================================
    // Tracking
    // ============================================

    override fun track(trackData: ReadableMap, promise: Promise) {
        val teal = tealium ?: run { promise.reject(ERROR_NOT_INITIALIZED, MSG_NOT_INITIALIZED); return }
        try {
            val name = trackData.getString("name") ?: run {
                promise.reject(ERROR_TRACK, "Event name is required"); return
            }
            val typeStr = trackData.getString("type") ?: "event"
            val type = if (typeStr == "view") DispatchType.View else DispatchType.Event
            val data = if (trackData.hasKey("data") && trackData.getType("data") == ReadableType.Map) {
                trackData.getMap("data")?.let { DataObject.fromMap(it.toHashMap()) } ?: DataObject.EMPTY_OBJECT
            } else {
                DataObject.EMPTY_OBJECT
            }
            teal.track(name, type, data).subscribe { result ->
                val trackResult = result.getOrNull()
                if (trackResult != null) {
                    val dispatch = trackResult.dispatch
                    val map = Arguments.createMap().apply {
                        putString("status", trackResult.status.name.lowercase())
                        putString("info", trackResult.info)
                        putMap("dispatch", Arguments.createMap().apply {
                            putString("id", dispatch.id)
                            putDouble("timestamp", dispatch.timestamp.toDouble())
                            putMap("payload", dispatch.payload().toWritableMap())
                        })
                    }
                    promise.resolve(map)
                } else {
                    val err = result.exceptionOrNull()
                    promise.reject(ERROR_TRACK, err?.message ?: "Track dispatch failed", err)
                }
            }
        } catch (e: Exception) {
            promise.reject(ERROR_TRACK, e.message, e)
        }
    }

    override fun flushEventQueue(promise: Promise) {
        val teal = tealium ?: run { promise.reject(ERROR_NOT_INITIALIZED, MSG_NOT_INITIALIZED); return }
        teal.flushEventQueue().subscribe { result ->
            if (result.isSuccess) promise.resolve(null)
            else {
                val err = result.exceptionOrNull()
                promise.reject(ERROR_FLUSH, err?.message ?: "Flush event queue failed", err)
            }
        }
    }

    // ============================================
    // Data Layer — delegated
    // ============================================

    override fun dataLayerPut(record: ReadableMap, expiry: Double, promise: Promise) = dataLayer.put(record, expiry, promise)
    override fun dataLayerGetDataItem(key: String, promise: Promise) = dataLayer.getDataItem(key, promise)
    override fun dataLayerGetDataList(key: String, promise: Promise) = dataLayer.getDataList(key, promise)
    override fun dataLayerGetDataObject(key: String, promise: Promise) = dataLayer.getDataObject(key, promise)
    override fun dataLayerRemove(key: String, promise: Promise) = dataLayer.remove(key, promise)
    override fun dataLayerRemoveKeys(keys: ReadableArray, promise: Promise) = dataLayer.removeKeys(keys, promise)
    override fun dataLayerClear(promise: Promise) = dataLayer.clear(promise)
    override fun dataLayerGetAll(promise: Promise) = dataLayer.getAll(promise)
    override fun dataLayerOnDataUpdatedSubscribe() = dataLayer.onDataUpdatedSubscribe()
    override fun dataLayerOnDataUpdatedDispose() = dataLayer.onDataUpdatedDispose()
    override fun dataLayerOnDataRemovedSubscribe() = dataLayer.onDataRemovedSubscribe()
    override fun dataLayerOnDataRemovedDispose() = dataLayer.onDataRemovedDispose()

    // ============================================
    // Consent — delegated
    // ============================================

    override fun consentSetDecision(decisionType: String, purposes: ReadableArray, promise: Promise) = consent.setDecision(decisionType, purposes, promise)
    override fun consentGetDecision(promise: Promise) = consent.getDecision(promise)
    override fun consentReset(promise: Promise) = consent.reset(promise)
    override fun consentGetAllPurposes(promise: Promise) = consent.getAllPurposes(promise)
    override fun consentOnDecisionChangedSubscribe() = consent.onDecisionChangedSubscribe()
    override fun consentOnDecisionChangedDispose() = consent.onDecisionChangedDispose()

    // ============================================
    // Trace / Visitor / Deep Link — delegated
    // ============================================

    override fun traceJoin(traceId: String, promise: Promise) = trace.join(traceId, promise)
    override fun traceLeave(promise: Promise) = trace.leave(promise)
    override fun traceForceEndOfVisit(promise: Promise) = trace.forceEndOfVisit(promise)
    override fun resetVisitorId(promise: Promise) = trace.resetVisitorId(promise)
    override fun clearStoredVisitorIds(promise: Promise) = trace.clearStoredVisitorIds(promise)
    override fun deepLinkHandle(url: String, referrer: String?, promise: Promise) = trace.handle(url, referrer, promise)

    // ============================================
    // NativeEventEmitter boilerplate
    // ============================================

    override fun addListener(eventType: String) {}

    // JS reference counting in DataLayerAPI.ts drives the enable/disable lifecycle.
    override fun removeListeners(count: Double) {}

    // ============================================
    // Private helpers
    // ============================================

    private fun getApplication(): Application? = try {
        reactApplicationContext.currentActivity?.application
            ?: reactApplicationContext.applicationContext as? Application
    } catch (e: Exception) {
        null
    }

    private fun sendEvent(eventName: String, params: Any?) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            android.util.Log.w(TAG, "Failed to emit event '$eventName': ${e.message}")
        }
    }
}
