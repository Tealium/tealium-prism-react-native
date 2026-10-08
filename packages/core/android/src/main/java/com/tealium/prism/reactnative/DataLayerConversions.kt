package com.tealium.prism.reactnative

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableType
import com.tealium.prism.core.api.persistence.Expiry

/**
 * Resolves the wire representation of an expiry into an [Expiry].
 *
 * The sentinels `-1`/`-2`/`-3` map to [Expiry.FOREVER]/[Expiry.SESSION]/[Expiry.UNTIL_RESTART]
 * via the SDK's [Expiry.fromLongValue]. Any other value is a Unix timestamp in milliseconds.
 *
 * @param encoded The encoded expiry as received from JS, or `null` when JS omitted it.
 * @return The resolved [Expiry], or `null` when [encoded] is `null`.
 */
internal fun resolveExpiry(encoded: Double?): Expiry? {
    val value = encoded?.toLong() ?: return null
    return when (value) {
        -1L, -2L, -3L -> Expiry.fromLongValue(value)
        // This bridge converts milliseconds to seconds: the wire format carries milliseconds to
        // match the Swift SDK's `Expiry(timestamp:)`, while the Kotlin SDK's Expiry is accurate to
        // the second, so any sub-second part is truncated.
        else -> Expiry.afterEpochTime(value / 1000)
    }
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
