package com.tealium.prism.reactnative

import com.tealium.prism.core.api.data.DataItem
import com.tealium.prism.core.api.data.DataList
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
 * Parses the JSON array of keys sent by `dataLayerRemove`.
 *
 * @param keysJson A JSON array of strings.
 * @return The keys in order, or `null` when [keysJson] is not a JSON array or holds an element
 *      that is not a string.
 */
internal fun parseKeys(keysJson: String): List<String>? {
    val keys = DataList.fromString(keysJson) ?: return null

    return keys.map { item -> item.getString() ?: return null }
}
