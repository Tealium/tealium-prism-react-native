package com.tealiumprismreactnative.consent

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.tealium.prism.core.api.consent.ConsentDecision
import com.tealiumprismreactnative.bridge.toStringSet

internal class ConsentDelegate(private val getAdapter: () -> BridgeCmpAdapter?) {

    fun setDecision(decisionType: String, purposes: ReadableArray) {
        val adapter = getAdapter() ?: return
        val type = ConsentDecision.DecisionType.entries
            .firstOrNull { it.name.equals(decisionType, ignoreCase = true) }
            ?: return
        val purposeSet = purposes.toStringSet()
        adapter.update(ConsentDecision(type, purposeSet))
    }

    fun getDecision(promise: Promise) {
        val decision = getAdapter()?.currentDecision
        if (decision == null) {
            promise.resolve(null)
            return
        }
        promise.resolve(decision.toWritableMap())
    }

    fun reset() {
        getAdapter()?.reset()
    }
}
