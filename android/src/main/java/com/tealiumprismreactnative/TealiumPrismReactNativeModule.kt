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
import com.tealium.prism.core.api.data.DataItem
import com.tealium.prism.core.api.data.DataItemUtils.asDataList
import com.tealium.prism.core.api.data.DataList
import com.tealium.prism.core.api.data.DataObject
import com.tealium.prism.core.api.consent.CmpAdapter
import com.tealium.prism.core.api.consent.ConsentDecision
import com.tealium.prism.core.api.pubsub.Disposable
import com.tealium.prism.core.api.logger.LogLevel
import com.tealium.prism.core.api.misc.Environment
import com.tealium.prism.core.api.misc.TimeFrame
import com.tealium.prism.core.api.misc.TimeFrameUtils.seconds
import com.tealium.prism.core.api.persistence.Expiry
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
    }

    private var tealium: Tealium? = null
    private var bridgeCmpAdapter: BridgeCmpAdapter? = null
    private var dataLayerEventsEnabled = false
    private var dataUpdateSubscription: Disposable? = null
    private var dataRemoveSubscription: Disposable? = null

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
            val environmentStr = config.getString("environment") ?: run {
                promise.reject("INIT_ERROR", "Environment is required")
                return
            }

            val environment = when (environmentStr) {
                "prod" -> Environment.PROD
                "qa" -> Environment.QA
                else -> Environment.DEV
            }

            val configBuilder = TealiumConfig.Builder(
                application = application,
                modules = emptyList(),
                accountName = account,
                profileName = profile,
                environment = environment
            )

            // Configure Core Settings
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

                config.getString("visitorIdentityKey")?.let {
                    settings.setVisitorIdentityKey(it)
                }

                if (config.hasKey("maxQueueSize")) {
                    settings.setMaxQueueSize(config.getInt("maxQueueSize"))
                }

                if (config.hasKey("queueExpirationSeconds")) {
                    settings.setExpiration(config.getInt("queueExpirationSeconds").seconds)
                }

                if (config.hasKey("refreshIntervalSeconds")) {
                    settings.setRefreshInterval(config.getInt("refreshIntervalSeconds").seconds)
                }

                if (config.hasKey("sessionTimeoutSeconds")) {
                    settings.setSessionTimeout(config.getInt("sessionTimeoutSeconds").seconds)
                }

                settings
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

            // Configure consent if consentAdapterId is present
            if (config.hasKey("consentAdapterId")) {
                val adapterId = config.getString("consentAdapterId") ?: "react-native-bridge"

                var defaultDecision: ConsentDecision? = null
                if (config.hasKey("consentDefaultDecisionType") && config.hasKey("consentDefaultPurposes")) {
                    val typeStr = config.getString("consentDefaultDecisionType")
                    val purposesArray = config.getArray("consentDefaultPurposes")
                    if (typeStr != null && purposesArray != null) {
                        val type = if (typeStr.lowercase() == "explicit") ConsentDecision.DecisionType.Explicit
                                   else ConsentDecision.DecisionType.Implicit
                        val purposes = mutableSetOf<String>()
                        for (i in 0 until purposesArray.size()) {
                            purposesArray.getString(i)?.let { purposes.add(it) }
                        }
                        defaultDecision = ConsentDecision(type, purposes)
                    }
                }

                val adapter = BridgeCmpAdapter(application, adapterId, defaultDecision)
                if (config.hasKey("consentPurposes")) {
                    val purposesArray = config.getArray("consentPurposes")
                    if (purposesArray != null) {
                        val purposes = mutableSetOf<String>()
                        for (i in 0 until purposesArray.size()) {
                            purposesArray.getString(i)?.let { purposes.add(it) }
                        }
                        adapter.allPurposes = purposes
                    }
                }
                configBuilder.enableConsentIntegration(adapter)
                bridgeCmpAdapter = adapter
            }

            // Create Tealium instance
            tealium = Tealium.create(configBuilder.build()) { result ->
                val teal = result.getOrNull()
                if (teal != null) {
                    promise.resolve(true)
                } else {
                    promise.resolve(false)
                }
            }

        } catch (e: Exception) {
            promise.reject("INIT_ERROR", e.message, e)
        }
    }

    override fun shutdown() {
        disableDataLayerEvents()
        tealium?.shutdown()
        tealium = null
        bridgeCmpAdapter = null
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

            teal.track(name, type, data)
                .subscribe { result ->
                    if (result.isSuccess) {
                        promise.resolve(null)
                    } else {
                        val error = result.exceptionOrNull()
                        promise.reject("TRACK_ERROR", error?.message ?: "Track dispatch failed", error)
                    }
                }

        } catch (e: Exception) {
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
                if (result.isSuccess) {
                    promise.resolve(null)
                } else {
                    val error = result.exceptionOrNull()
                    promise.reject("FLUSH_ERROR", error?.message ?: "Flush event queue failed", error)
                }
            }
    }

    // ============================================
    // Data Layer
    // ============================================

    override fun setDataLayerString(key: String, value: String, expiry: String) {
        val teal = tealium ?: return
        teal.dataLayer.put(key, value, expiryFromString(expiry))
    }

    override fun setDataLayerNumber(key: String, value: Double, expiry: String) {
        val teal = tealium ?: return
        teal.dataLayer.put(key, value, expiryFromString(expiry))
    }

    override fun setDataLayerBoolean(key: String, value: Boolean, expiry: String) {
        val teal = tealium ?: return
        teal.dataLayer.put(key, value, expiryFromString(expiry))
    }

    override fun setDataLayerObject(key: String, value: ReadableMap, expiry: String) {
        val teal = tealium ?: return
        val dataObject = readableMapToDataObject(value)
        teal.dataLayer.put(key, dataObject, expiryFromString(expiry))
    }

    override fun setDataLayerStringArray(key: String, value: ReadableArray, expiry: String) {
        val teal = tealium ?: return
        val list = mutableListOf<String>()
        for (i in 0 until value.size()) {
            value.getString(i)?.let { list.add(it) }
        }
        teal.dataLayer.put(key, list.asDataList(), expiryFromString(expiry))
    }

    override fun getDataLayerValue(key: String, promise: Promise) {
        val teal = tealium
        if (teal == null) {
            promise.reject("NOT_INITIALIZED", "Tealium is not initialized")
            return
        }
        teal.dataLayer.get(key).subscribe { result ->
            val dataItem = result.getOrNull()
            promise.resolve(if (dataItem != null) dataItemToMap(dataItem) else null)
        }
    }

    override fun removeDataLayerValue(key: String) {
        val teal = tealium ?: return
        teal.dataLayer.remove(key)
    }

    override fun removeDataLayerValues(keys: ReadableArray) {
        val teal = tealium ?: return
        val keyList = mutableListOf<String>()
        for (i in 0 until keys.size()) {
            keys.getString(i)?.let { keyList.add(it) }
        }
        if (keyList.isNotEmpty()) {
            teal.dataLayer.remove(keyList)
        }
    }

    override fun clearDataLayer(promise: Promise) {
        val teal = tealium
        if (teal == null) {
            promise.reject("NOT_INITIALIZED", "Tealium is not initialized")
            return
        }
        teal.dataLayer.clear().subscribe { result ->
            if (result.isSuccess) {
                promise.resolve(null)
            } else {
                val error = result.exceptionOrNull()
                promise.reject("DATA_LAYER_ERROR", error?.message ?: "Failed to clear data layer", error)
            }
        }
    }

    override fun getAllData(promise: Promise) {
        val teal = tealium
        if (teal == null) {
            promise.reject("NOT_INITIALIZED", "Tealium is not initialized")
            return
        }
        teal.dataLayer.getAll().subscribe { result ->
            val dataObject = result.getOrNull()
            if (dataObject == null) {
                promise.resolve(Arguments.createMap())
            } else {
                promise.resolve(dataObjectToMap(dataObject))
            }
        }
    }

    // ============================================
    // Deep Link
    // ============================================

    override fun handleDeepLink(url: String, referrer: String?, promise: Promise) {
        val teal = tealium
        if (teal == null) {
            promise.reject("NOT_INITIALIZED", "Tealium is not initialized")
            return
        }
        val deepLinkUri = android.net.Uri.parse(url)
        if (deepLinkUri.scheme == null) {
            promise.resolve(false)
            return
        }
        val referrerUri = referrer?.let { android.net.Uri.parse(it) }
        teal.deeplink.handle(deepLinkUri, referrerUri).subscribe { result ->
            promise.resolve(result.isSuccess)
        }
    }

    // ============================================
    // Trace
    // ============================================

    override fun joinTrace(traceId: String) {
        val teal = tealium ?: return
        teal.trace.join(traceId)
    }

    override fun leaveTrace() {
        val teal = tealium ?: return
        teal.trace.leave()
    }

    override fun forceEndOfVisit() {
        val teal = tealium ?: return
        teal.trace.forceEndOfVisit()
    }

    // ============================================
    // Visitor / Identity
    // ============================================

    override fun resetVisitorId(promise: Promise) {
        val teal = tealium
        if (teal == null) {
            promise.reject("NOT_INITIALIZED", "Tealium is not initialized")
            return
        }

        teal.resetVisitorId()
            .subscribe { result ->
                val newId = result.getOrNull()
                if (newId != null) {
                    promise.resolve(newId)
                } else {
                    val error = result.exceptionOrNull()
                    promise.reject("RESET_ERROR", error?.message ?: "Failed to reset visitor ID", error)
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
                val newId = result.getOrNull()
                if (newId != null) {
                    promise.resolve(newId)
                } else {
                    val error = result.exceptionOrNull()
                    promise.reject("CLEAR_ERROR", error?.message ?: "Failed to clear stored visitor IDs", error)
                }
            }
    }

    // ============================================
    // Consent
    // ============================================

    override fun setConsentDecision(decisionType: String, purposes: ReadableArray) {
        val adapter = bridgeCmpAdapter ?: return
        val type = if (decisionType.lowercase() == "explicit") {
            ConsentDecision.DecisionType.Explicit
        } else {
            ConsentDecision.DecisionType.Implicit
        }
        val purposeSet = mutableSetOf<String>()
        for (i in 0 until purposes.size()) {
            purposes.getString(i)?.let { purposeSet.add(it) }
        }
        adapter.update(ConsentDecision(type, purposeSet))
    }

    override fun getConsentDecision(promise: Promise) {
        val adapter = bridgeCmpAdapter
        val decision = adapter?.currentDecision
        if (decision == null) {
            promise.resolve(null)
            return
        }
        val map = Arguments.createMap()
        map.putString("decisionType", if (decision.decisionType == ConsentDecision.DecisionType.Explicit) "explicit" else "implicit")
        val purposesArray = Arguments.createArray()
        decision.purposes.forEach { purposesArray.pushString(it) }
        map.putArray("purposes", purposesArray)
        promise.resolve(map)
    }

    override fun resetConsentDecision() {
        bridgeCmpAdapter?.reset()
    }

    // ============================================
    // Helper Methods
    // ============================================

    private fun getApplication(): Application? {
        return try {
            reactApplicationContext.currentActivity?.application
                ?: reactApplicationContext.applicationContext as? Application
        } catch (e: Exception) {
            null
        }
    }

    private fun expiryFromString(expiry: String): Expiry {
        return when (expiry.lowercase()) {
            "forever" -> Expiry.FOREVER
            "untilrestart" -> Expiry.UNTIL_RESTART
            else -> Expiry.SESSION
        }
    }

    private fun readableArrayToDataList(array: ReadableArray): DataList? {
        if (array.size() == 0) return null
        return when (array.getType(0)) {
            ReadableType.String -> {
                val list = mutableListOf<String>()
                for (i in 0 until array.size()) {
                    array.getString(i)?.let { list.add(it) }
                }
                list.asDataList()
            }
            ReadableType.Number -> {
                val list = mutableListOf<Double>()
                for (i in 0 until array.size()) {
                    list.add(array.getDouble(i))
                }
                list.asDataList()
            }
            ReadableType.Boolean -> {
                val list = mutableListOf<Boolean>()
                for (i in 0 until array.size()) {
                    list.add(array.getBoolean(i))
                }
                list.asDataList()
            }
            ReadableType.Map -> {
                val list = mutableListOf<DataObject>()
                for (i in 0 until array.size()) {
                    array.getMap(i)?.let { list.add(readableMapToDataObject(it)) }
                }
                list.asDataList()
            }
            else -> null
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
                    if (array != null) {
                        readableArrayToDataList(array)?.let { builder.put(key, it) }
                    }
                }
                else -> { /* Skip null values */ }
            }
        }

        return builder.build()
    }

    private fun dataItemToMap(item: DataItem): com.facebook.react.bridge.WritableMap {
        val map = Arguments.createMap()
        when {
            item.isString() -> {
                map.putString("type", "string")
                map.putString("value", item.getString())
            }
            item.isNumber() -> {
                map.putString("type", "number")
                map.putDouble("value", item.getDouble()!!)
            }
            item.isBoolean() -> {
                map.putString("type", "boolean")
                map.putBoolean("value", item.getBoolean()!!)
            }
            item.isNull() -> map.putString("type", "null")
            item.isDataList() -> {
                map.putString("type", "list")
                val arr = Arguments.createArray()
                item.getDataList()?.forEach { arr.pushMap(dataItemToMap(it)) }
                map.putArray("value", arr)
            }
            item.isDataObject() -> {
                map.putString("type", "object")
                val obj = Arguments.createMap()
                item.getDataObject()?.forEach { (k, v) -> obj.putMap(k, dataItemToMap(v)) }
                map.putMap("value", obj)
            }
        }
        return map
    }

    private fun dataObjectToMap(dataObject: DataObject): com.facebook.react.bridge.WritableMap {
        val map = Arguments.createMap()
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
                        val array = Arguments.createArray()
                        for (item in dataList) {
                            when {
                                item.isString() -> item.getString()?.let { array.pushString(it) }
                                item.isNumber() -> item.getDouble()?.let { array.pushDouble(it) }
                                item.isBoolean() -> item.getBoolean()?.let { array.pushBoolean(it) }
                                item.isDataObject() -> item.getDataObject()?.let { array.pushMap(dataObjectToMap(it)) }
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
    // DataLayer Events
    // ============================================

    override fun enableDataLayerEvents() {
        if (dataLayerEventsEnabled) return
        val teal = tealium ?: return
        dataLayerEventsEnabled = true

        val dataLayer = teal.dataLayer

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

    // ============================================
    // DataLayer Transactional Operations
    // ============================================

    override fun dataLayerTransactionalUpdate(
        keysToRead: ReadableArray,
        operations: ReadableArray,
        promise: Promise
    ) {
        val teal = tealium
        if (teal == null) {
            promise.reject("NOT_INITIALIZED", "Tealium is not initialized")
            return
        }

        val keysToReadList = mutableListOf<String>()
        for (i in 0 until keysToRead.size()) {
            keysToRead.getString(i)?.let { keysToReadList.add(it) }
        }

        if (operations.size() == 0 && keysToReadList.isEmpty()) {
            promise.resolve(Arguments.createMap())
            return
        }

        if (operations.size() == 0 && keysToReadList.isNotEmpty()) {
            val preReadValues = Arguments.createMap()
            val remaining = java.util.concurrent.atomic.AtomicInteger(keysToReadList.size)

            for (key in keysToReadList) {
                teal.dataLayer.get(key).subscribe { result ->
                    result.getOrNull()?.let { dataItem ->
                        synchronized(preReadValues) {
                            when {
                                dataItem.getString() != null ->
                                    preReadValues.putString(key, dataItem.getString())
                                dataItem.getDouble() != null ->
                                    preReadValues.putDouble(key, dataItem.getDouble()!!)
                                dataItem.getInt() != null ->
                                    preReadValues.putInt(key, dataItem.getInt()!!)
                                dataItem.getBoolean() != null ->
                                    preReadValues.putBoolean(key, dataItem.getBoolean()!!)
                                dataItem.getDataObject() != null ->
                                    preReadValues.putMap(key, dataObjectToMap(dataItem.getDataObject()!!))
                                dataItem.getDataList() != null -> {
                                    val arr = Arguments.createArray()
                                    dataItem.getDataList()?.forEach { item ->
                                        when {
                                            item.isString() -> item.getString()?.let { arr.pushString(it) }
                                            item.isNumber() -> item.getDouble()?.let { arr.pushDouble(it) }
                                            item.isBoolean() -> item.getBoolean()?.let { arr.pushBoolean(it) }
                                        }
                                    }
                                    preReadValues.putArray(key, arr)
                                }
                            }
                        }
                    }
                    if (remaining.decrementAndGet() == 0) {
                        promise.resolve(preReadValues)
                    }
                }
            }
            return
        }

        teal.dataLayer.transactionally { editor ->
            for (i in 0 until operations.size()) {
                val op = operations.getMap(i) ?: continue
                val type = op.getString("type") ?: continue
                val key = op.getString("key") ?: continue

                when (type) {
                    "put" -> {
                        val expiry = expiryFromString(op.getString("expiry") ?: "session")
                        if (op.hasKey("value")) {
                            when (op.getType("value")) {
                                ReadableType.String ->
                                    editor.put(key, op.getString("value")!!, expiry)
                                ReadableType.Number ->
                                    editor.put(key, op.getDouble("value"), expiry)
                                ReadableType.Boolean ->
                                    editor.put(key, op.getBoolean("value"), expiry)
                                ReadableType.Map -> {
                                    val nestedMap = op.getMap("value")
                                    if (nestedMap != null) {
                                        editor.put(key, readableMapToDataObject(nestedMap), expiry)
                                    }
                                }
                                ReadableType.Array -> {
                                    val arr = op.getArray("value")
                                    if (arr != null) {
                                        readableArrayToDataList(arr)?.let { editor.put(key, it, expiry) }
                                    }
                                }
                                else -> {}
                            }
                        }
                    }
                    "remove" -> editor.remove(key)
                }
            }
            editor.commit()
        }.subscribe { result ->
            if (result.isSuccess) {
                promise.resolve(Arguments.createMap())
            } else {
                promise.reject("TRANSACTION_ERROR", "Transaction failed")
            }
        }
    }

    override fun addListener(eventType: String) {}

    // JS reference counting in DataLayerAPI.ts drives the enable/disable lifecycle.
    override fun removeListeners(count: Double) {}

    private fun sendEvent(eventName: String, params: Any?) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            // Ignore — nothing we can do if the JS event bus is unavailable.
        }
    }
}
