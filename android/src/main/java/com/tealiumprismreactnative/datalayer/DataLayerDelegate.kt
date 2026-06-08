package com.tealiumprismreactnative.datalayer

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.tealium.prism.core.api.Tealium
import com.tealium.prism.core.api.data.DataList
import com.tealium.prism.core.api.data.DataObject
import com.tealium.prism.core.api.persistence.Expiry
import com.tealium.prism.core.api.pubsub.Disposable
import com.tealiumprismreactnative.ERROR_DATA_LAYER
import com.tealiumprismreactnative.ERROR_NOT_INITIALIZED
import com.tealiumprismreactnative.MSG_NOT_INITIALIZED
import com.tealiumprismreactnative.TAG
import com.tealiumprismreactnative.TealiumPrismReactNativeModule
import com.tealiumprismreactnative.bridge.toStringList

internal class DataLayerDelegate(
    private val getTealium: () -> Tealium?,
    private val sendEvent: (String, Any?) -> Unit
) {
    private var updateSubscription: Disposable? = null
    private var removeSubscription: Disposable? = null

    fun put(record: ReadableMap, expiry: Double, promise: Promise) {
        val teal = getTealium() ?: run { promise.reject(ERROR_NOT_INITIALIZED, MSG_NOT_INITIALIZED); return }
        teal.dataLayer.put(DataObject.fromMap(record.toHashMap()), Expiry.fromLongValue(expiry.toLong())).subscribe { result ->
            if (result.isSuccess) promise.resolve(null)
            else {
                val err = result.exceptionOrNull()
                promise.reject(ERROR_DATA_LAYER, err?.message ?: "Failed to put data", err)
            }
        }
    }

    fun getDataItem(key: String, promise: Promise) {
        val teal = getTealium() ?: run { promise.reject(ERROR_NOT_INITIALIZED, MSG_NOT_INITIALIZED); return }
        teal.dataLayer.get(key).subscribe { result ->
            result.exceptionOrNull()?.let { err ->
                promise.reject(ERROR_DATA_LAYER, err.message ?: "Failed to get data item", err)
                return@subscribe
            }
            val item = result.getOrNull()
            promise.resolve(item?.toSerializable())
        }
    }

    fun getDataList(key: String, promise: Promise) {
        val teal = getTealium() ?: run { promise.reject(ERROR_NOT_INITIALIZED, MSG_NOT_INITIALIZED); return }
        teal.dataLayer.getDataList(key).subscribe { result ->
            result.exceptionOrNull()?.let { err ->
                promise.reject(ERROR_DATA_LAYER, err.message ?: "Failed to get data list", err)
                return@subscribe
            }
            val list = result.getOrNull()
            if (list == null) {
                promise.resolve(null)
                return@subscribe
            }
            promise.resolve(list.toWritableArray())
        }
    }

    fun getDataObject(key: String, promise: Promise) {
        val teal = getTealium() ?: run { promise.reject(ERROR_NOT_INITIALIZED, MSG_NOT_INITIALIZED); return }
        teal.dataLayer.getDataObject(key).subscribe { result ->
            result.exceptionOrNull()?.let { err ->
                promise.reject(ERROR_DATA_LAYER, err.message ?: "Failed to get data object", err)
                return@subscribe
            }
            val obj = result.getOrNull()
            if (obj == null) {
                promise.resolve(null)
                return@subscribe
            }
            promise.resolve(obj.toWritableMap())
        }
    }

    fun remove(key: String, promise: Promise) {
        val teal = getTealium() ?: run { promise.reject(ERROR_NOT_INITIALIZED, MSG_NOT_INITIALIZED); return }
        teal.dataLayer.remove(key).subscribe { result ->
            if (result.isSuccess) promise.resolve(null)
            else {
                val err = result.exceptionOrNull()
                promise.reject(ERROR_DATA_LAYER, err?.message ?: "Failed to remove key", err)
            }
        }
    }

    fun removeKeys(keys: ReadableArray, promise: Promise) {
        val teal = getTealium() ?: run { promise.reject(ERROR_NOT_INITIALIZED, MSG_NOT_INITIALIZED); return }
        val keyList = keys.toStringList()
        if (keyList.isEmpty()) {
            promise.resolve(null)
            return
        }
        teal.dataLayer.remove(keyList).subscribe { result ->
            if (result.isSuccess) promise.resolve(null)
            else {
                val err = result.exceptionOrNull()
                promise.reject(ERROR_DATA_LAYER, err?.message ?: "Failed to remove keys", err)
            }
        }
    }

    fun clear(promise: Promise) {
        val teal = getTealium() ?: run { promise.reject(ERROR_NOT_INITIALIZED, MSG_NOT_INITIALIZED); return }
        teal.dataLayer.clear().subscribe { result ->
            if (result.isSuccess) promise.resolve(null)
            else {
                val err = result.exceptionOrNull()
                promise.reject(ERROR_DATA_LAYER, err?.message ?: "Failed to clear data layer", err)
            }
        }
    }

    fun getAll(promise: Promise) {
        val teal = getTealium() ?: run { promise.reject(ERROR_NOT_INITIALIZED, MSG_NOT_INITIALIZED); return }
        teal.dataLayer.getAll().subscribe { result ->
            result.exceptionOrNull()?.let { err ->
                promise.reject(ERROR_DATA_LAYER, err.message ?: "Failed to get all data", err)
                return@subscribe
            }
            val obj = result.getOrNull()
            promise.resolve(if (obj != null) obj.toWritableMap() else Arguments.createMap())
        }
    }

    fun onDataUpdatedSubscribe() {
        onDataUpdatedDispose()
        val teal = getTealium() ?: run {
            Log.w(TAG, "onDataUpdatedSubscribe called before initialization")
            return
        }
        updateSubscription = teal.dataLayer.onDataUpdated.subscribe { dataObject ->
            sendEvent(TealiumPrismReactNativeModule.EVENT_DATA_LAYER_UPDATED, dataObject.toWritableMap())
        }
    }

    fun onDataUpdatedDispose() {
        updateSubscription?.dispose()
        updateSubscription = null
    }

    fun onDataRemovedSubscribe() {
        onDataRemovedDispose()
        val teal = getTealium() ?: run {
            Log.w(TAG, "onDataRemovedSubscribe called before initialization")
            return
        }
        removeSubscription = teal.dataLayer.onDataRemoved.subscribe { keys ->
            val array = Arguments.createArray()
            keys.forEach { array.pushString(it) }
            val map = Arguments.createMap()
            map.putArray("keys", array)
            sendEvent(TealiumPrismReactNativeModule.EVENT_DATA_LAYER_REMOVED, map)
        }
    }

    fun onDataRemovedDispose() {
        removeSubscription?.dispose()
        removeSubscription = null
    }

}
