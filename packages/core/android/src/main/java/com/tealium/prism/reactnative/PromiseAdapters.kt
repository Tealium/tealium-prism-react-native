package com.tealium.prism.reactnative

import com.facebook.react.bridge.Promise
import com.tealium.prism.core.api.data.DataItem
import com.tealium.prism.core.api.data.DataItemConvertible
import com.tealium.prism.core.api.pubsub.SingleResult

/**
 * Subscribes to this [SingleResult], resolving [promise] with the JSON string of the
 * emitted [DataItemConvertible] on success and rejecting it with the error on failure.
 */
internal fun <T : DataItemConvertible> SingleResult<T>.subscribe(promise: Promise) =
    subscribe(promise, DataItemConvertible::asDataItem)

/**
 * Subscribes to this [SingleResult], converting the emitted value to a [DataItem] via
 * [converter] and resolving [promise] with its JSON string on success, or rejecting
 * [promise] with the error on failure.
 */
internal inline fun <T> SingleResult<T>.subscribe(
    promise: Promise,
    crossinline converter: (T) -> DataItem
) = subscribeResolving(promise) { jsonString(converter(it)) }

/**
 * Subscribes to this String-emitting [SingleResult], resolving [promise] with the raw emitted
 * String on success and rejecting with the error on failure. Unlike [subscribe], the value is not
 * routed through [DataItem]/JSON encoding, so scalar strings (e.g. a visitor id) reach JS unquoted
 * and need no JS-side parse. The distinct name avoids the JVM signature clash with the
 * [DataItemConvertible] [subscribe] overload (both erase to the same signature).
 */
internal fun SingleResult<String>.subscribeString(promise: Promise) =
    subscribeResolving(promise) { it }

/**
 * One-shot subscription shared by the promise adapters: resolves [promise] with the String produced
 * by [toResult] on success, rejects with `PRISM_NATIVE_ERROR` on failure, and rejects with
 * `TEALIUM_CANCELLED` if the Single completes without emitting a value.
 */
private inline fun <T> SingleResult<T>.subscribeResolving(
    promise: Promise,
    crossinline toResult: (T) -> String
) {
    // One-shot subscription: it completes on first emission and the returned Disposable
    // deallocates on its own, so we don't retain it.
    var emitted = false
    subscribe(
        { result ->
            emitted = true
            result
                .onSuccess { value -> promise.resolve(toResult(value)) }
                .onFailure { t -> promise.reject(ErrorCode.PRISM_NATIVE_ERROR, t.message, t) }
        },
        {
            if (!emitted) {
                promise.reject(ErrorCode.TEALIUM_CANCELLED, "Single completed without emitting a value")
            }
        }
    )
}
