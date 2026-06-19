package com.tealium.prism.reactnative.data

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.tealium.prism.core.api.data.DataObject

/**
 * Outbound bridge conversion: `DataObject` -> `WritableMap`.
 *
 * Iterates every entry and recurses through nested `DataObject`/`DataList`.
 *
 * `mapFactory`/`arrayFactory` default to `Arguments` for production; tests pass
 * pure-JVM `JavaOnlyMap`/`JavaOnlyArray` factories so the converter can run off
 * a device.
 */
internal fun DataObject.toWritableMap(
  mapFactory: () -> WritableMap = { Arguments.createMap() },
  arrayFactory: () -> WritableArray = { Arguments.createArray() },
): WritableMap {
  val map = mapFactory()
  for ((key, item) in this) {
    item.putInto(map, key, mapFactory, arrayFactory)
  }
  return map
}
