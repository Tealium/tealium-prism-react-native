package com.tealium.prism.reactnative

import com.facebook.react.bridge.Promise
import com.tealium.prism.core.api.Tealium

/**
 * Looks up the [Tealium] instance identified by [instanceId] and invokes [block] with it once
 * found. If no instance exists for [instanceId], rejects [promise] with `INSTANCE_NOT_FOUND`
 * instead of invoking [block].
 */
internal inline fun Tealium.Companion.withInstance(
  instanceId: String,
  promise: Promise,
  crossinline block: (Tealium) -> Unit
) {
  get(instanceId) { instance ->
    if (instance == null) {
      promise.reject("INSTANCE_NOT_FOUND", "No Tealium instance with key '$instanceId'")
    } else {
      block(instance)
    }
  }
}
