package com.tealiumprismreactnative.datalayer

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.tealium.prism.core.api.data.DataItem
import com.tealium.prism.core.api.data.DataList
import com.tealium.prism.core.api.data.DataObject

// Converts a single DataItem into {type, value} format for get(key).
// JS needs the "type" field to tell apart numbers, strings, lists, etc.
internal fun DataItem.toWritableMap(): WritableMap {
    val map = Arguments.createMap()
    when (val v = value) {
        is String    -> { map.putString("type", "string");  map.putString("value", v) }
        is Boolean   -> { map.putString("type", "boolean"); map.putBoolean("value", v) }
        is Number    -> { map.putString("type", "number");  map.putDouble("value", v.toDouble()) }
        is DataList  -> { map.putString("type", "list");    map.putArray("value", v.toWritableArray()) }
        is DataObject -> { map.putString("type", "object"); map.putMap("value", v.toDataItemWritableMap()) }
        else         -> map.putString("type", "null")
    }
    return map
}
