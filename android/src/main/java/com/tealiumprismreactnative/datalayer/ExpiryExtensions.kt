package com.tealiumprismreactnative.datalayer

import android.util.Log
import com.tealium.prism.core.api.persistence.Expiry
import com.tealiumprismreactnative.TAG

/// Creates an [Expiry] from the string representation used by the React Native bridge.
/// Unknown strings default to [Expiry.FOREVER] and emit a warning log.
internal fun Expiry.Companion.fromRNString(expiry: String): Expiry = when (expiry.lowercase()) {
    "session"      -> SESSION
    "untilrestart" -> UNTIL_RESTART
    "forever"      -> FOREVER
    else -> {
        Log.w(TAG, "Unknown expiry value '$expiry', defaulting to FOREVER")
        FOREVER
    }
}
