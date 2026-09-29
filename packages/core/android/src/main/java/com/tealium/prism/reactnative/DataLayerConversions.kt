package com.tealium.prism.reactnative

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableType
import com.tealium.prism.core.api.data.DataItem
import com.tealium.prism.core.api.misc.ExpiryPolicy
import com.tealium.prism.core.api.persistence.Expiry

/**
 * Resolves the wire representation of an expiry policy into an [Expiry].
 *
 * [encoded] is handed straight to the SDK: the meaning of the value — the negative sentinels,
 * non-negative durations in seconds, and how a fractional value like `1.5` truncates — belongs to
 * [ExpiryPolicy.Converter] and is not reimplemented here.
 *
 * @param encoded The encoded policy as received from JS, or `null` when JS omitted it.
 * @return The resolved [Expiry], or `null` when [encoded] is `null` or is not a value the SDK
 *      converter recognizes.
 */
internal fun resolveExpiry(encoded: Double?): Expiry? {
    return encoded?.let { ExpiryPolicy.Converter.convert(DataItem.double(it)) }?.resolve()
}

/**
 * Converts the [ReadableArray] of keys sent by `dataLayerRemove` into a [List] of strings.
 *
 * @param keys The array as received from JS.
 * @return The keys in order, or `null` when any element is not a string.
 */
internal fun stringList(keys: ReadableArray): List<String>? {
    return (0 until keys.size()).map { index ->
        if (keys.getType(index) != ReadableType.String) return null
        keys.getString(index) ?: return null
    }
}
