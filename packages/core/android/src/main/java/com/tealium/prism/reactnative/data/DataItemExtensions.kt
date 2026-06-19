package com.tealium.prism.reactnative.data

import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.tealium.prism.core.api.data.DataItem
import com.tealium.prism.core.api.data.DataList
import com.tealium.prism.core.api.data.DataObject

/**
 * Outbound bridge conversion for a single `DataItem`.
 *
 * Switching on the concrete `value` type (rather than `getDouble()` and
 * friends) preserves type fidelity: `getDouble()` coerces any numeric, so it
 * would collapse `Int`/`Long` into `Double`. `DataItem.value` is always one of
 * `String | Boolean | Int | Long | Double | DataList | DataObject | null`.
 *
 * `Long` is written via `putDouble`/`pushDouble`: a JS `number` is IEEE-754
 * double and cannot represent the full `Long` range. (Inbound never produces a
 * `Long` from JS — JS numbers arrive as `Double` — so this only affects values
 * an SDK-side caller stored as `Long`.)
 *
 * `mapFactory`/`arrayFactory` let production use `Arguments.createMap()` while
 * unit tests inject pure-JVM `JavaOnlyMap`/`JavaOnlyArray` (the native
 * `WritableNativeMap` cannot be constructed off-device).
 */
internal fun DataItem.putInto(
  map: WritableMap,
  key: String,
  mapFactory: () -> WritableMap,
  arrayFactory: () -> WritableArray,
) {
  when (val v = value) {
    is String -> map.putString(key, v)
    is Boolean -> map.putBoolean(key, v)
    is Int -> map.putInt(key, v)
    is Long -> map.putDouble(key, v.toDouble())
    is Double -> map.putDouble(key, v)
    is DataList -> map.putArray(key, v.toWritableArray(mapFactory, arrayFactory))
    is DataObject -> map.putMap(key, v.toWritableMap(mapFactory, arrayFactory))
    else -> map.putNull(key)
  }
}

/**
 * Outbound conversion for a single `DataItem` appended to a `WritableArray`.
 * Null elements are pushed as `null` to preserve positions, never skipped.
 */
internal fun DataItem.pushInto(
  array: WritableArray,
  mapFactory: () -> WritableMap,
  arrayFactory: () -> WritableArray,
) {
  when (val v = value) {
    is String -> array.pushString(v)
    is Boolean -> array.pushBoolean(v)
    is Int -> array.pushInt(v)
    is Long -> array.pushDouble(v.toDouble())
    is Double -> array.pushDouble(v)
    is DataList -> array.pushArray(v.toWritableArray(mapFactory, arrayFactory))
    is DataObject -> array.pushMap(v.toWritableMap(mapFactory, arrayFactory))
    else -> array.pushNull()
  }
}
