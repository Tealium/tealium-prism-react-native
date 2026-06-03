package com.tealiumprismreactnative.datalayer

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.tealium.prism.core.api.data.DataItem
import com.tealium.prism.core.api.data.DataObject

// Converts a DataObject into a plain {key: value} map. Used by getAll() and event emission.
internal fun DataObject.toWritableMap(): WritableMap {
    val map = Arguments.createMap()
    for ((key, item) in this) item.putInto(map, key)
    return map
}
