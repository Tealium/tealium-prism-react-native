package com.tealiumprismreactnative.consent

import android.content.Context
import com.tealium.prism.core.api.consent.CmpAdapter
import com.tealium.prism.core.api.consent.ConsentDecision
import com.tealium.prism.core.api.pubsub.Observable
import com.tealium.prism.core.api.pubsub.Observables

/**
 * Bridge CMP adapter that receives consent decisions pushed from JavaScript.
 * Implements the native CmpAdapter interface, holding a StateSubject that the
 * SDK's consent pipeline subscribes to.
 *
 * Persists the last known decision to SharedPreferences so consent state survives
 * app restarts without requiring JS to re-push the decision on every launch.
 */
internal class BridgeCmpAdapter(
    context: Context,
    override val id: String = "react-native-bridge",
    private val defaultDecision: ConsentDecision? = null
) : CmpAdapter {

    companion object {
        private const val KEY_DECISION_TYPE = "decision_type"
        private const val KEY_DECISION_PURPOSES = "decision_purposes"
    }

    private val prefs = context.getSharedPreferences(
        "tealium-prism-rn-consent-$id",
        Context.MODE_PRIVATE
    )

    private val _consentDecision = Observables.stateSubject(readPersistedDecision() ?: defaultDecision)
    override val consentDecision: Observable<ConsentDecision?> = _consentDecision.asObservableState()
    override var allPurposes: Set<String>? = null

    fun update(decision: ConsentDecision) {
        if (_consentDecision.value == decision) return
        saveDecision(decision)
        _consentDecision.onNext(decision)
    }

    fun reset() {
        clearDecision()
        _consentDecision.onNext(defaultDecision)
    }

    val currentDecision: ConsentDecision? get() = _consentDecision.value

    private fun readPersistedDecision(): ConsentDecision? {
        val typeStr = prefs.getString(KEY_DECISION_TYPE, null) ?: return null
        val rawPurposes = prefs.getStringSet(KEY_DECISION_PURPOSES, null) ?: return null
        val type = ConsentDecision.DecisionType.entries
            .firstOrNull { it.name.equals(typeStr, ignoreCase = true) } ?: return null
        return ConsentDecision(type, rawPurposes.toHashSet())
    }

    private fun saveDecision(decision: ConsentDecision) {
        prefs.edit()
            .putString(KEY_DECISION_TYPE, decision.decisionType.name.lowercase())
            .putStringSet(KEY_DECISION_PURPOSES, decision.purposes)
            .apply()
    }

    private fun clearDecision() {
        prefs.edit()
            .remove(KEY_DECISION_TYPE)
            .remove(KEY_DECISION_PURPOSES)
            .apply()
    }
}
