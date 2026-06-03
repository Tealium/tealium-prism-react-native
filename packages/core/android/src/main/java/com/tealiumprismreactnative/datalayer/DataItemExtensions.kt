package com.tealiumprismreactnative.datalayer

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.tealium.prism.core.api.data.DataItem
import com.tealium.prism.core.api.data.DataList
import com.tealium.prism.core.api.data.DataObject

// Wraps the value in {value:} for getDataItem. Required because TurboModule
// spec declares Object return type — a raw scalar cannot be returned directly.
internal fun DataItem.toWritableMap(): WritableMap {
    val map = Arguments.createMap()
    when (val v = value) {
        is String     -> map.putString("value", v)
        is Boolean    -> map.putBoolean("value", v)
        is Number     -> map.putDouble("value", v.toDouble())
        is DataList   -> map.putArray("value", v.toWritableArray())
        is DataObject -> map.putMap("value", v.toWritableMap())
        else          -> map.putNull("value")
    }
    return map
}

// Writes the value of a DataItem into a WritableMap at the given key.
internal fun DataItem.putInto(map: WritableMap, key: String) {
    when (val v = value) {
        is String     -> map.putString(key, v)
        is Boolean    -> map.putBoolean(key, v)
        is Number     -> map.putDouble(key, v.toDouble())
        is DataList   -> map.putArray(key, v.toWritableArray())
        is DataObject -> map.putMap(key, v.toWritableMap())
        else          -> map.putNull(key)
    }
}

// Pushes the value of a DataItem onto a WritableArray.
internal fun DataItem.pushInto(array: WritableArray) {
    when (val v = value) {
        is String     -> array.pushString(v)
        is Boolean    -> array.pushBoolean(v)
        is Number     -> array.pushDouble(v.toDouble())
        is DataList   -> array.pushArray(v.toWritableArray())
        is DataObject -> array.pushMap(v.toWritableMap())
        else          -> array.pushNull()
    }
}
