package com.tealium.prism.reactnative.data

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.tealium.prism.core.api.data.DataList
import com.tealium.prism.core.api.data.DataObject

/**
 * Inbound bridge conversion: React Native bridge types -> Prism SDK data types.
 *
 * Both functions delegate entirely to the SDK's own conversion APIs — no manual
 * type-switching at the bridge. `toHashMap()`/`toArrayList()` produce plain
 * `HashMap`/`ArrayList` (every JS number is boxed as `Double`), and
 * `DataObject.fromMap()` / `DataList.fromCollection()` dispatch each value
 * through `DataItem.convert(any)`, which recurses into nested maps/collections.
 *
 * Throws `UnsupportedDataItemException` if a map key is not a `String`.
 */
internal fun ReadableMap.toDataObject(): DataObject = DataObject.fromMap(toHashMap())

internal fun ReadableArray.toDataList(): DataList = DataList.fromCollection(toArrayList())
