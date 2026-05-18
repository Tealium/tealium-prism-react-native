package com.tealiumprismreactnative.datalayer

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.tealium.prism.core.api.data.DataItem
import com.tealium.prism.core.api.data.DataList
import com.tealium.prism.core.api.data.DataObject


// Converts a DataObject into {key: {type, value}} map. Used inside {type:"object"} envelopes.
internal fun DataObject.toDataItemWritableMap(): WritableMap {
    val map = Arguments.createMap()
    for ((key, item) in this) {
        map.putMap(key, item.toWritableMap())
    }
    return map
}

// Converts a DataObject into a plain {key: value} map. Used by getAll() and event emission.
// Unlike toDataItemWritableMap, values here are raw (no {type, value} wrapping).
internal fun DataObject.toRawWritableMap(): WritableMap {
    val map = Arguments.createMap()
    for ((key, item) in this) {
        when (val v = item.value) {
            is String    -> map.putString(key, v)
            is Boolean   -> map.putBoolean(key, v)
            is Number    -> map.putDouble(key, v.toDouble())
            is DataList  -> map.putArray(key, v.toRawWritableArray())
            is DataObject -> map.putMap(key, v.toRawWritableMap())
            else         -> map.putNull(key)
        }
    }
    return map
}
