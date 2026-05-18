package com.tealiumprismreactnative.consent

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.tealium.prism.core.api.consent.ConsentDecision

private const val KEY_DECISION_TYPE = "decisionType"
private const val KEY_PURPOSES = "purposes"

internal fun ConsentDecision.toWritableMap(): WritableMap = Arguments.createMap().apply {
    putString(KEY_DECISION_TYPE, decisionType.name.lowercase())
    putArray(KEY_PURPOSES, Arguments.createArray().also { arr -> purposes.forEach { arr.pushString(it) } })
}
