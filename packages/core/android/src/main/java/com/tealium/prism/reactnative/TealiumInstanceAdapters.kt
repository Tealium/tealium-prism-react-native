package com.tealium.prism.reactnative

import com.facebook.react.bridge.Promise
import com.tealium.prism.core.api.Tealium

/**
 * Looks up the [Tealium] instance identified by [instanceId] and invokes [block] with it once
 * found. If no instance exists for [instanceId], rejects [promise] with `INSTANCE_NOT_FOUND`
 * instead of invoking [block].
 *
 * [onNotFound] runs first on that path: it is the hook for callers that recorded state before
 * the lookup (e.g. a pending subscription entry) and must undo it before the rejection reaches
 * JS.
 */
internal inline fun Tealium.Companion.withInstance(
    instanceId: String,
    promise: Promise,
    crossinline onNotFound: () -> Unit = {},
    crossinline block: (Tealium) -> Unit
) {
    get(instanceId) { instance ->
        if (instance == null) {
            onNotFound()
            promise.reject(ErrorCode.INSTANCE_NOT_FOUND, "No Tealium instance with key '$instanceId'")
        } else {
            block(instance)
        }
    }
}
