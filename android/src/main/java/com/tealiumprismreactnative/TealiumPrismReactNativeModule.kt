package com.tealiumprismreactnative

import android.app.Application
import android.util.Log
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
import com.tealium.prism.core.api.data.DataItemUtils.asDataList
import com.tealium.prism.core.api.data.DataObject
import com.tealium.prism.core.api.pubsub.Disposable
import com.tealium.prism.core.api.logger.LogLevel
import com.tealium.prism.core.api.misc.Environment
import com.tealium.prism.core.api.persistence.Expiry
import com.tealium.prism.core.api.tracking.DispatchType
import com.tealium.prism.lifecycle.lifecycle
import com.tealium.prism.momentsapi.MomentsApiRegion
import com.tealium.prism.momentsapi.momentsApi

class TealiumPrismReactNativeModule(reactContext: ReactApplicationContext) :
    NativeTealiumPrismReactNativeSpec(reactContext) {

    companion object {
        const val TAG = "TealiumPrismRN"
        const val NAME = NativeTealiumPrismReactNativeSpec.NAME
        const val EVENT_DATA_LAYER_UPDATED = "TealiumDataLayerUpdated"
        const val EVENT_DATA_LAYER_REMOVED = "TealiumDataLayerRemoved"
    }

    private var tealium: Tealium? = null
    private var dataLayerEventsEnabled = false
    private var dataUpdateSubscription: Disposable? = null
    private var dataRemoveSubscription: Disposable? = null
    private var listenerCount = 0

    // ============================================
    // Initialization & Lifecycle
    // ============================================

    override fun initialize(config: ReadableMap, promise: Promise) {
        try {
            val application = getApplication()
            if (application == null) {
                promise.resolve(false)
                return
            }

            val account = config.getString("account") ?: run {
                promise.reject("INIT_ERROR", "Account is required")
                return
            }
            val profile = config.getString("profile") ?: run {
                promise.reject("INIT_ERROR", "Profile is required")
                return
            }
            val environmentStr = config.getString("environment") ?: "dev"

            val environment = when (environmentStr) {
                "prod" -> Environment.PROD
                "qa" -> Environment.QA
                else -> Environment.DEV
            }

            // Check if lifecycle is enabled (default true)
            val lifecycleEnabled = if (config.hasKey("lifecycleEnabled")) {
                config.getBoolean("lifecycleEnabled")
            } else {
                true
            }

            // Configure modules
            val modules = mutableListOf(
                Modules.collect(),
                Modules.appData(),
                Modules.deviceData(),
                Modules.connectivityData(),
                Modules.trace(),
                Modules.deepLink()
            )

            // Add lifecycle module if enabled
            if (lifecycleEnabled) {
                modules.add(Modules.lifecycle())
            }

            // Add MomentsAPI module if region is provided
            val momentsApiRegion = if (config.hasKey("momentsApiRegion")) {
                when (config.getString("momentsApiRegion")) {
                    "germany" -> MomentsApiRegion.Germany
                    "us_east" -> MomentsApiRegion.UsEast
                    "sydney" -> MomentsApiRegion.Sydney
                    "oregon" -> MomentsApiRegion.Oregon
                    "tokyo" -> MomentsApiRegion.Tokyo
                    "hong_kong" -> MomentsApiRegion.HongKong
                    else -> null
                }
            } else null

            if (momentsApiRegion != null) {
                modules.add(Modules.momentsApi { it.setRegion(momentsApiRegion) })
            }

            val configBuilder = TealiumConfig.Builder(
                application = application,
                modules = modules,
                accountName = account,
                profileName = profile,
                environment = environment
            )

            // Apply log level if provided
            if (config.hasKey("logLevel")) {
                val logLevelStr = config.getString("logLevel")
                val logLevel = when (logLevelStr) {
                    "trace" -> LogLevel.TRACE
                    "debug" -> LogLevel.DEBUG
                    "info" -> LogLevel.INFO
                    "warn" -> LogLevel.WARN
                    "error" -> LogLevel.ERROR
                    "silent" -> LogLevel.SILENT
                    else -> LogLevel.ERROR
                }
                configBuilder.configureCoreSettings { settings ->
                    settings.setLogLevel(logLevel)
                }
            }

            // Apply settings file if provided
            if (config.hasKey("settingsFile")) {
                val settingsFile = config.getString("settingsFile")
                if (settingsFile != null) {
                    configBuilder.setSettingsFile(settingsFile)
                }
            }

            // Apply settings URL if provided
            if (config.hasKey("settingsUrl")) {
                val settingsUrl = config.getString("settingsUrl")
                if (settingsUrl != null) {
                    configBuilder.setSettingsUrl(settingsUrl)
                }
            }

            // Apply data source if provided
            if (config.hasKey("dataSource")) {
                val dataSource = config.getString("dataSource")
                if (dataSource != null) {
                    configBuilder.setDataSource(dataSource)
                }
            }

            // Apply existing visitor ID if provided
            if (config.hasKey("existingVisitorId")) {
                val existingVisitorId = config.getString("existingVisitorId")
                if (existingVisitorId != null) {
                    configBuilder.setExistingVisitorId(existingVisitorId)
                }
            }

            // Apply visitor identity key if provided
            if (config.hasKey("visitorIdentityKey")) {
                val visitorIdentityKey = config.getString("visitorIdentityKey")
                if (visitorIdentityKey != null) {
                    configBuilder.configureCoreSettings { settings ->
                        settings.setVisitorIdentityKey(visitorIdentityKey)
                    }
                }
            }

            // Create Tealium instance
            tealium = Tealium.create(configBuilder.build()) { result ->
                val teal = result.getOrNull()
                if (teal != null) {
                    Log.d(TAG, "Tealium initialized successfully")
                    promise.resolve(true)
                } else {
                    Log.e(TAG, "Tealium initialization failed")
                    promise.resolve(false)
                }
            }

        } catch (e: Exception) {
            Log.e(TAG, "Initialization error", e)
            promise.reject("INIT_ERROR", e.message, e)
        }
    }

    override fun shutdown() {
        tealium?.shutdown()
        tealium = null
    }

    override fun isInitialized(promise: Promise) {
        promise.resolve(tealium != null)
    }

    // ============================================
    // Tracking
    // ============================================

    override fun track(trackData: ReadableMap, promise: Promise) {
        val teal = tealium
        if (teal == null) {
            promise.reject("NOT_INITIALIZED", "Tealium is not initialized")
            return
        }

        try {
            val name = trackData.getString("name") ?: run {
                promise.reject("TRACK_ERROR", "Event name is required")
                return
            }
            val typeStr = trackData.getString("type") ?: "event"
            val type = if (typeStr == "view") DispatchType.View else DispatchType.Event

            val data = if (trackData.hasKey("data") && trackData.getType("data") == ReadableType.Map) {
                readableMapToDataObject(trackData.getMap("data"))
            } else {
                DataObject.EMPTY_OBJECT
            }

            Log.d(TAG, "Track called: name=$name, type=$typeStr, data=$data")
            teal.track(name, type, data)
                .subscribe { result ->
                    try {
                        val trackResult = result.getOrThrow()
                        Log.d(TAG, "Track success: ${trackResult.description}")
                        promise.resolve(null)
                    } catch (error: Exception) {
                        Log.e(TAG, "Track failed", error)
                        promise.resolve(null) // Still resolve to not block JS
                    }
                }

        } catch (e: Exception) {
            Log.e(TAG, "Track error", e)
            promise.reject("TRACK_ERROR", e.message, e)
        }
    }

    override fun flushEventQueue(promise: Promise) {
        val teal = tealium
        if (teal == null) {
            promise.reject("NOT_INITIALIZED", "Tealium is not initialized")
            return
        }

        teal.flushEventQueue()
            .subscribe { result ->
                try {
                    result.getOrThrow()
                    promise.resolve(null)
                } catch (error: Exception) {
                    Log.e(TAG, "Flush failed", error)
                    promise.resolve(null)
                }
            }
    }

    // ============================================
    // Data Layer
    // ============================================

    override fun setDataLayerString(key: String, value: String, expiry: String) {
        tealium?.dataLayer?.put(key, value, expiryFromString(expiry))
    }

    override fun setDataLayerNumber(key: String, value: Double, expiry: String) {
        tealium?.dataLayer?.put(key, value, expiryFromString(expiry))
    }

    override fun setDataLayerBoolean(key: String, value: Boolean, expiry: String) {
        tealium?.dataLayer?.put(key, value, expiryFromString(expiry))
    }

    override fun setDataLayerObject(key: String, value: ReadableMap, expiry: String) {
        val dataObject = readableMapToDataObject(value)
        tealium?.dataLayer?.put(key, dataObject, expiryFromString(expiry))
    }

    override fun setDataLayerStringArray(key: String, value: ReadableArray, expiry: String) {
        val list = mutableListOf<String>()
        for (i in 0 until value.size()) {
            value.getString(i)?.let { list.add(it) }
        }
        tealium?.dataLayer?.put(key, list.asDataList(), expiryFromString(expiry))
    }

    override fun getDataLayerString(key: String, promise: Promise) {
        tealium?.dataLayer?.getString(key)
            ?.subscribe { result ->
                promise.resolve(result.getOrNull())
            } ?: promise.resolve(null)
    }

    override fun getDataLayerNumber(key: String, promise: Promise) {
        tealium?.dataLayer?.getDouble(key)
            ?.subscribe { result ->
                promise.resolve(result.getOrNull())
            } ?: promise.resolve(null)
    }

    override fun getDataLayerBoolean(key: String, promise: Promise) {
        tealium?.dataLayer?.getBoolean(key)
            ?.subscribe { result ->
                promise.resolve(result.getOrNull())
            } ?: promise.resolve(null)
    }

    override fun getDataLayerObject(key: String, promise: Promise) {
        tealium?.dataLayer?.getDataObject(key)
            ?.subscribe { result ->
                val dataObject = result.getOrNull()
                if (dataObject != null) {
                    promise.resolve(dataObjectToMap(dataObject))
                } else {
                    promise.resolve(null)
                }
            } ?: promise.resolve(null)
    }

    override fun getDataLayerStringArray(key: String, promise: Promise) {
        tealium?.dataLayer?.getDataList(key)
            ?.subscribe { result ->
                val dataList = result.getOrNull()
                if (dataList != null) {
                    val array = com.facebook.react.bridge.Arguments.createArray()
                    for (item in dataList) {
                        item.getString()?.let { array.pushString(it) }
                    }
                    promise.resolve(array)
                } else {
                    promise.resolve(null)
                }
            } ?: promise.resolve(null)
    }

    override fun removeDataLayerValue(key: String) {
        tealium?.dataLayer?.remove(key)
    }

    override fun removeDataLayerValues(keys: ReadableArray) {
        val keyList = mutableListOf<String>()
        for (i in 0 until keys.size()) {
            keys.getString(i)?.let { keyList.add(it) }
        }
        if (keyList.isNotEmpty()) {
            tealium?.dataLayer?.remove(keyList)
        }
    }

    // ============================================
    // Trace
    // ============================================

    override fun joinTrace(traceId: String) {
        tealium?.trace?.join(traceId)
    }

    override fun leaveTrace() {
        tealium?.trace?.leave()
    }

    // ============================================
    // Visitor / Identity
    // ============================================

    override fun getVisitorId(promise: Promise) {
        tealium?.dataLayer?.getString("tealium_visitor_id")
            ?.subscribe { result ->
                promise.resolve(result.getOrNull())
            } ?: promise.resolve(null)
    }

    override fun resetVisitorId(promise: Promise) {
        val teal = tealium
        if (teal == null) {
            promise.reject("NOT_INITIALIZED", "Tealium is not initialized")
            return
        }

        teal.resetVisitorId()
            .subscribe { result ->
                try {
                    val newId = result.getOrThrow()
                    promise.resolve(newId)
                } catch (error: Exception) {
                    promise.reject("RESET_ERROR", error.message, error)
                }
            }
    }

    override fun clearStoredVisitorIds(promise: Promise) {
        val teal = tealium
        if (teal == null) {
            promise.reject("NOT_INITIALIZED", "Tealium is not initialized")
            return
        }

        teal.clearStoredVisitorIds()
            .subscribe { result ->
                try {
                    val newId = result.getOrThrow()
                    promise.resolve(newId)
                } catch (error: Exception) {
                    promise.reject("CLEAR_ERROR", error.message, error)
                }
            }
    }

    // ============================================
    // Consent
    // ============================================

    override fun setConsentStatus(status: String) {
        // Consent in Prism is managed through CMP adapters
        // This is a basic implementation storing in data layer
        tealium?.dataLayer?.put("consent_status", status, Expiry.FOREVER)
    }

    override fun getConsentStatus(promise: Promise) {
        tealium?.dataLayer?.getString("consent_status")
            ?.subscribe { result ->
                promise.resolve(result.getOrNull() ?: "unknown")
            } ?: promise.resolve("unknown")
    }

    override fun setConsentCategories(categories: ReadableArray) {
        val list = mutableListOf<String>()
        for (i in 0 until categories.size()) {
            categories.getString(i)?.let { list.add(it) }
        }
        tealium?.dataLayer?.put("consent_categories", list.asDataList(), Expiry.FOREVER)
    }

    override fun getConsentCategories(promise: Promise) {
        tealium?.dataLayer?.getDataList("consent_categories")
            ?.subscribe { result ->
                val array = com.facebook.react.bridge.Arguments.createArray()
                val categories = result.getOrNull()
                if (categories != null) {
                    for (item in categories) {
                        item.getString()?.let { array.pushString(it) }
                    }
                }
                promise.resolve(array)
            } ?: promise.resolve(com.facebook.react.bridge.Arguments.createArray())
    }

    // ============================================
    // Helper Methods
    // ============================================

    private fun getApplication(): Application? {
        return try {
            reactApplicationContext.currentActivity?.application
                ?: reactApplicationContext.applicationContext as? Application
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get Application", e)
            null
        }
    }

    private fun expiryFromString(expiry: String): Expiry {
        return when (expiry) {
            "forever" -> Expiry.FOREVER
            "untilRestart" -> Expiry.UNTIL_RESTART
            else -> Expiry.SESSION
        }
    }

    private fun readableMapToDataObject(map: ReadableMap?): DataObject {
        if (map == null) return DataObject.EMPTY_OBJECT

        val builder = DataObject.Builder()
        val iterator = map.keySetIterator()

        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            when (map.getType(key)) {
                ReadableType.String -> {
                    map.getString(key)?.let { builder.put(key, it) }
                }
                ReadableType.Number -> {
                    builder.put(key, map.getDouble(key))
                }
                ReadableType.Boolean -> {
                    builder.put(key, map.getBoolean(key))
                }
                ReadableType.Map -> {
                    val nestedMap = map.getMap(key)
                    if (nestedMap != null) {
                        builder.put(key, readableMapToDataObject(nestedMap))
                    }
                }
                ReadableType.Array -> {
                    val array = map.getArray(key)
                    if (array != null && array.size() > 0) {
                        when (array.getType(0)) {
                            ReadableType.String -> {
                                val list = mutableListOf<String>()
                                for (i in 0 until array.size()) {
                                    array.getString(i)?.let { list.add(it) }
                                }
                                builder.put(key, list.asDataList())
                            }
                            ReadableType.Number -> {
                                val list = mutableListOf<Double>()
                                for (i in 0 until array.size()) {
                                    list.add(array.getDouble(i))
                                }
                                builder.put(key, list.asDataList())
                            }
                            else -> {
                                // Mixed or complex arrays - serialize as JSON string
                            }
                        }
                    }
                }
                else -> { /* Skip null values */ }
            }
        }

        return builder.build()
    }

    private fun dataObjectToMap(dataObject: DataObject): com.facebook.react.bridge.WritableMap {
        val map = com.facebook.react.bridge.Arguments.createMap()
        for ((key, dataItem) in dataObject) {
            when {
                dataItem.isString() -> map.putString(key, dataItem.getString())
                dataItem.isNumber() -> {
                    dataItem.getDouble()?.let { map.putDouble(key, it) }
                }
                dataItem.isBoolean() -> {
                    dataItem.getBoolean()?.let { map.putBoolean(key, it) }
                }
                dataItem.isDataList() -> {
                    val dataList = dataItem.getDataList()
                    if (dataList != null) {
                        val array = com.facebook.react.bridge.Arguments.createArray()
                        for (item in dataList) {
                            when {
                                item.isString() -> item.getString()?.let { array.pushString(it) }
                                item.isNumber() -> item.getDouble()?.let { array.pushDouble(it) }
                                item.isBoolean() -> item.getBoolean()?.let { array.pushBoolean(it) }
                            }
                        }
                        map.putArray(key, array)
                    }
                }
                dataItem.isDataObject() -> {
                    val nestedObject = dataItem.getDataObject()
                    if (nestedObject != null) {
                        map.putMap(key, dataObjectToMap(nestedObject))
                    }
                }
            }
        }
        return map
    }

    // ============================================
    // MomentsAPI
    // ============================================

    override fun fetchEngineResponse(engineId: String, promise: Promise) {
        val teal = tealium
        if (teal == null) {
            promise.reject("NOT_INITIALIZED", "Tealium is not initialized")
            return
        }

        val momentsApi = teal.momentsApi
        if (momentsApi == null) {
            promise.reject("MOMENTS_NOT_CONFIGURED", "MomentsAPI is not configured. Set momentsApiRegion in config.")
            return
        }

        momentsApi.fetchEngineResponse(engineId)
            .subscribe { result ->
                try {
                    val engineResponse = result.getOrThrow()
                    val map = Arguments.createMap()

                    // Audiences
                    engineResponse.audiences?.let { audiences ->
                        val array = Arguments.createArray()
                        audiences.forEach { array.pushString(it) }
                        map.putArray("audiences", array)
                    }

                    // Badges
                    engineResponse.badges?.let { badges ->
                        val array = Arguments.createArray()
                        badges.forEach { array.pushString(it) }
                        map.putArray("badges", array)
                    }

                    // Flags (booleans)
                    engineResponse.flags?.let { flags ->
                        val flagsMap = Arguments.createMap()
                        flags.forEach { (key, value) -> flagsMap.putBoolean(key, value) }
                        map.putMap("flags", flagsMap)
                    }

                    // Dates (as milliseconds)
                    engineResponse.dates?.let { dates ->
                        val datesMap = Arguments.createMap()
                        dates.forEach { (key, value) -> datesMap.putDouble(key, value.toDouble()) }
                        map.putMap("dates", datesMap)
                    }

                    // Metrics (numbers)
                    engineResponse.metrics?.let { metrics ->
                        val metricsMap = Arguments.createMap()
                        metrics.forEach { (key, value) -> metricsMap.putDouble(key, value) }
                        map.putMap("metrics", metricsMap)
                    }

                    // Properties (strings)
                    engineResponse.properties?.let { properties ->
                        val propertiesMap = Arguments.createMap()
                        properties.forEach { (key, value) -> propertiesMap.putString(key, value) }
                        map.putMap("properties", propertiesMap)
                    }

                    promise.resolve(map)
                } catch (error: Exception) {
                    Log.e(TAG, "FetchEngineResponse failed", error)
                    promise.resolve(null)
                }
            }
    }

    // ============================================
    // Trace (Extended)
    // ============================================

    override fun forceEndOfVisit() {
        tealium?.trace?.forceEndOfVisit()
    }

    // ============================================
    // Lifecycle (Manual)
    // ============================================

    override fun lifecycleLaunch(data: ReadableMap?, promise: Promise) {
        val teal = tealium
        if (teal == null) {
            promise.reject("NOT_INITIALIZED", "Tealium is not initialized")
            return
        }

        val lifecycle = teal.lifecycle
        if (lifecycle == null) {
            promise.reject("LIFECYCLE_NOT_CONFIGURED", "Lifecycle module is not configured")
            return
        }

        val dataObject = if (data != null) readableMapToDataObject(data) else DataObject.EMPTY_OBJECT
        lifecycle.launch(dataObject)
            .subscribe { result ->
                try {
                    result.getOrThrow()
                    promise.resolve(null)
                } catch (error: Exception) {
                    Log.e(TAG, "Lifecycle launch failed", error)
                    promise.resolve(null)
                }
            }
    }

    override fun lifecycleWake(data: ReadableMap?, promise: Promise) {
        val teal = tealium
        if (teal == null) {
            promise.reject("NOT_INITIALIZED", "Tealium is not initialized")
            return
        }

        val lifecycle = teal.lifecycle
        if (lifecycle == null) {
            promise.reject("LIFECYCLE_NOT_CONFIGURED", "Lifecycle module is not configured")
            return
        }

        val dataObject = if (data != null) readableMapToDataObject(data) else DataObject.EMPTY_OBJECT
        lifecycle.wake(dataObject)
            .subscribe { result ->
                try {
                    result.getOrThrow()
                    promise.resolve(null)
                } catch (error: Exception) {
                    Log.e(TAG, "Lifecycle wake failed", error)
                    promise.resolve(null)
                }
            }
    }

    override fun lifecycleSleep(data: ReadableMap?, promise: Promise) {
        val teal = tealium
        if (teal == null) {
            promise.reject("NOT_INITIALIZED", "Tealium is not initialized")
            return
        }

        val lifecycle = teal.lifecycle
        if (lifecycle == null) {
            promise.reject("LIFECYCLE_NOT_CONFIGURED", "Lifecycle module is not configured")
            return
        }

        val dataObject = if (data != null) readableMapToDataObject(data) else DataObject.EMPTY_OBJECT
        lifecycle.sleep(dataObject)
            .subscribe { result ->
                try {
                    result.getOrThrow()
                    promise.resolve(null)
                } catch (error: Exception) {
                    Log.e(TAG, "Lifecycle sleep failed", error)
                    promise.resolve(null)
                }
            }
    }

    // ============================================
    // DataLayer Events
    // ============================================

    override fun enableDataLayerEvents() {
        if (dataLayerEventsEnabled) return
        dataLayerEventsEnabled = true

        val dataLayer = tealium?.dataLayer ?: return

        dataUpdateSubscription = dataLayer.onDataUpdated.subscribe { dataObject ->
            sendEvent(EVENT_DATA_LAYER_UPDATED, dataObjectToMap(dataObject))
        }

        dataRemoveSubscription = dataLayer.onDataRemoved.subscribe { keys ->
            val array = Arguments.createArray()
            keys.forEach { array.pushString(it) }
            val map = Arguments.createMap()
            map.putArray("keys", array)
            sendEvent(EVENT_DATA_LAYER_REMOVED, map)
        }
    }

    override fun disableDataLayerEvents() {
        dataLayerEventsEnabled = false
        dataUpdateSubscription?.dispose()
        dataRemoveSubscription?.dispose()
        dataUpdateSubscription = null
        dataRemoveSubscription = null
    }

    override fun addListener(eventType: String) {
        listenerCount++
    }

    override fun removeListeners(count: Double) {
        listenerCount -= count.toInt()
        if (listenerCount <= 0) {
            listenerCount = 0
            disableDataLayerEvents()
        }
    }

    private fun sendEvent(eventName: String, params: Any?) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send event: $eventName", e)
        }
    }
}
