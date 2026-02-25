package com.tealiumprismreactnative

import com.tealium.prism.core.api.consent.CmpAdapter
import com.tealium.prism.core.api.consent.ConsentDecision
import com.tealium.prism.core.api.pubsub.Observable
import com.tealium.prism.core.api.pubsub.Observables

/**
 * Bridge CMP adapter that receives consent decisions pushed from JavaScript.
 * Implements the native CmpAdapter interface, holding a StateSubject that the
 * SDK's consent pipeline subscribes to.
 */
internal class BridgeCmpAdapter : CmpAdapter {
    override val id = "react-native-bridge"
    private val _consentDecision = Observables.stateSubject<ConsentDecision?>(null)
    override val consentDecision: Observable<ConsentDecision?> = _consentDecision.asObservableState()
    override var allPurposes: Set<String>? = null

    fun update(decision: ConsentDecision) {
        _consentDecision.onNext(decision)
    }

    fun reset() {
        _consentDecision.onNext(null)
    }

    val currentDecision: ConsentDecision? get() = _consentDecision.value
}
