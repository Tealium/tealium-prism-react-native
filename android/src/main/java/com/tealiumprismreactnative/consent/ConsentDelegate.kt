package com.tealiumprismreactnative.consent

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.tealium.prism.core.api.consent.ConsentDecision
import com.tealium.prism.core.api.pubsub.Disposable
import com.tealiumprismreactnative.TAG
import com.tealiumprismreactnative.TealiumPrismReactNativeModule
import com.tealiumprismreactnative.bridge.toStringSet

internal class ConsentDelegate(
    private val getAdapter: () -> BridgeCmpAdapter?,
    private val sendEvent: (String, Any?) -> Unit
) {
    private var decisionSubscription: Disposable? = null

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

    fun getAllPurposes(promise: Promise) {
        val purposes = getAdapter()?.allPurposes
        if (purposes == null) {
            promise.resolve(null)
            return
        }
        val arr = Arguments.createArray()
        purposes.forEach { arr.pushString(it) }
        promise.resolve(arr)
    }

    fun onDecisionChangedSubscribe() {
        onDecisionChangedDispose()
        val adapter = getAdapter() ?: run {
            Log.w(TAG, "onDecisionChangedSubscribe called before initialization")
            return
        }
        decisionSubscription = adapter.consentDecision.subscribe { decision ->
            val payload: WritableMap = Arguments.createMap()
            if (decision != null) {
                payload.putMap("decision", decision.toWritableMap())
            } else {
                payload.putNull("decision")
            }
            sendEvent(TealiumPrismReactNativeModule.EVENT_CONSENT_DECISION_CHANGED, payload)
        }
    }

    fun onDecisionChangedDispose() {
        decisionSubscription?.dispose()
        decisionSubscription = null
    }
}
