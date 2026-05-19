package com.tealiumprismreactnative.datalayer

import android.util.Log
import com.tealium.prism.core.api.persistence.Expiry
import com.tealiumprismreactnative.TAG

/**
 * Creates an [Expiry] from the string representation used by the React Native bridge.
 *
 * Named variants: `"session"`, `"forever"`, `"untilRestart"`.
 * Time-based variants (serialized by DataLayerAPI.ts):
 *   `"afterEpochSeconds:<n>"` → [Expiry.afterEpochTime]
 * Unknown strings default to [Expiry.FOREVER] and emit a warning log.
 */
internal fun Expiry.Companion.fromRNString(expiry: String): Expiry {
    val lower = expiry.lowercase()
    if (lower.startsWith("afterepochseconds:")) {
        val epoch = lower.removePrefix("afterepochseconds:").toLongOrNull()
        if (epoch != null) return afterEpochTime(epoch)
    }
    return when (lower) {
        "session"      -> SESSION
        "untilrestart" -> UNTIL_RESTART
        "forever"      -> FOREVER
        else -> {
            Log.w(TAG, "Unknown expiry value '$expiry', defaulting to FOREVER")
            FOREVER
        }
    }
}
