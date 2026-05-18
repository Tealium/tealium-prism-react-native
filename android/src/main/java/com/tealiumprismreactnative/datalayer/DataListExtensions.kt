package com.tealiumprismreactnative.datalayer

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.tealium.prism.core.api.data.DataItem
import com.tealium.prism.core.api.data.DataList
import com.tealium.prism.core.api.data.DataObject


// Converts a DataList into an array of {type, value} envelopes. Used inside {type:"list"} envelopes.
internal fun DataList.toWritableArray(): WritableArray {
    val array = Arguments.createArray()
    for (item in this) {
        array.pushMap(item.toWritableMap())
    }
    return array
}

// Converts a DataList into a plain array of raw values. Used by getAll() and transactional pre-reads.
internal fun DataList.toRawWritableArray(): WritableArray {
    val array = Arguments.createArray()
    for (item in this) {
        when (val v = item.value) {
            is String -> array.pushString(v)
            is Boolean -> array.pushBoolean(v)
            is Number -> array.pushDouble(v.toDouble())
            is DataList -> array.pushArray(v.toRawWritableArray())
            is DataObject -> array.pushMap(v.toRawWritableMap())
            else -> array.pushNull()
        }
    }
    return array
}
