package com.tealium.prism.reactnative.data

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.tealium.prism.core.api.data.DataList

/**
 * Outbound bridge conversion: `DataList` -> `WritableArray`.
 *
 * Iterates every element recursively (nested lists are converted, not dropped).
 *
 * `mapFactory`/`arrayFactory` default to `Arguments` for production; tests pass
 * pure-JVM `JavaOnlyMap`/`JavaOnlyArray` factories.
 */
internal fun DataList.toWritableArray(
  mapFactory: () -> WritableMap = { Arguments.createMap() },
  arrayFactory: () -> WritableArray = { Arguments.createArray() },
): WritableArray {
  val array = arrayFactory()
  for (item in this) {
    item.pushInto(array, mapFactory, arrayFactory)
  }
  return array
}
