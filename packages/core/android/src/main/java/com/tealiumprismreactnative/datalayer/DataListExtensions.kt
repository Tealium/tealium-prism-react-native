package com.tealiumprismreactnative.datalayer

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.tealium.prism.core.api.data.DataList

// Converts a DataList into a plain array of values. Used by getAll() and event emission.
internal fun DataList.toWritableArray(): WritableArray {
    val array = Arguments.createArray()
    for (item in this) item.pushInto(array)
    return array
}
