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
 * [promise] with the error on failure. Delegates to [subscribeNullable]; a non-null
 * converter never hits its `null` branch.
 */
internal inline fun <T> SingleResult<T>.subscribe(
    promise: Promise,
    crossinline converter: (T) -> DataItem
) = subscribeNullable(promise, converter)

/**
 * Subscribes to this [SingleResult], converting the emitted value to a [DataItem] via [converter].
 * Resolves [promise] with a real `null` when [converter] returns `null` (the absent-key case of
 * `DataLayer.get`) and with the [DataItem]'s JSON string otherwise, or rejects [promise] with the
 * error on failure.
 */
internal inline fun <T> SingleResult<T>.subscribeNullable(
    promise: Promise,
    crossinline converter: (T) -> DataItem?
) {
    // One-shot subscription: it completes on first emission and the returned Disposable
    // deallocates on its own, so we don't retain it.
    var emitted = false
    subscribe(
        { result ->
            emitted = true
            result
                .onSuccess { value ->
                    val item = converter(value)
                    promise.resolve(item?.let(::jsonString))
                }
                .onFailure { t -> promise.reject(ErrorCode.PRISM_NATIVE_ERROR, t.message, t) }
        },
        {
            if (!emitted) {
                promise.reject(ErrorCode.TEALIUM_CANCELLED, "Single completed without emitting a value")
            }
        }
    )
}
