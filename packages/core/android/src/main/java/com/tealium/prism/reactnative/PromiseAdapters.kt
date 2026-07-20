package com.tealium.prism.reactnative

import com.facebook.react.bridge.Promise
import com.tealium.prism.core.api.data.DataItem
import com.tealium.prism.core.api.pubsub.SingleResult

/**
 * Shared one-shot subscription: rejects [promise] with the error on failure or with
 * [ErrorCode.TEALIUM_CANCELLED] on a non-emitting completion, delegating success handling to
 * [onSuccess] so callers decide what to resolve with.
 *
 * One-shot: the subscription completes on first emission and the returned Disposable deallocates
 * on its own, so we don't retain it.
 */
private inline fun <T> SingleResult<T>.subscribeInternal(
    promise: Promise,
    crossinline onSuccess: (T) -> Unit
) {
    var emitted = false
    subscribe(
        { result ->
            emitted = true
            result
                .onSuccess { value -> onSuccess(value) }
                .onFailure { t -> promise.reject(ErrorCode.PRISM_NATIVE_ERROR, t.message, t) }
        },
        {
            if (!emitted) {
                promise.reject(ErrorCode.TEALIUM_CANCELLED, "Single completed without emitting a value")
            }
        }
    )
}

/**
 * Subscribes to a payload-less [SingleResult], resolving [promise] with `null` (so the JS promise
 * resolves to `undefined`) on success and rejecting it with the error on failure. Used by one-shot
 * Unit-returning APIs such as `Trace.join`/`Trace.leave`.
 */
internal fun SingleResult<Unit>.subscribe(promise: Promise) =
    subscribeInternal(promise) { promise.resolve(null) }

/**
 * Subscribes to this [SingleResult], converting the emitted value to a [DataItem] via
 * [converter] and resolving [promise] with its JSON string on success, or rejecting
 * [promise] with the error on failure.
 */
internal inline fun <T> SingleResult<T>.subscribe(
    promise: Promise,
    crossinline converter: (T) -> DataItem
) = subscribeInternal(promise) { value -> promise.resolve(jsonString(converter(value))) }
