package com.tealium.prism.reactnative

import com.tealium.prism.core.api.pubsub.Disposable
import java.util.concurrent.ConcurrentHashMap

/**
 * Tracks the lifecycle of native DataLayer subscriptions, keyed by the opaque
 * `subscriptionId` JS mints. Every promise-backed and event-backed call can run
 * on an arbitrary Tealium thread, so all state is held in [ConcurrentHashMap]s
 * and every mutation is a single atomic [ConcurrentHashMap.compute]; the
 * [Disposable] is disposed *outside* the compute lambda to avoid re-entering
 * the map from within its own update.
 *
 * The registration path is async: JS asks to subscribe ([markPending]) before
 * the SDK hands back a [Disposable] ([register]). Three orderings must not leak
 * or double-dispose:
 *  - unsubscribe / shutdown arriving before [register] → the entry is
 *    tombstoned and the late [Disposable] is disposed the moment it registers;
 *  - the SDK stream completing independently → [teardown];
 *  - normal unsubscribe after [register] → dispose once, drop the entry.
 *
 * TODO: (?) Prism exposes no subscription→instance lifecycle manager, so
 * the wrapper tracks it here to guarantee dispose-on-shutdown (Android's
 * `Tealium.shutdown` never emits `onComplete`). Keep this minimal; drop it if
 * the SDK gains an owning manager.
 */
internal class SubscriptionStore {
    private sealed interface State
    private data class Pending(val instanceId: String) : State
    private data class Active(val instanceId: String, val disposable: Disposable) : State
    private data object Tombstoned : State

    private val states = ConcurrentHashMap<String, State>()
    private val byInstance = ConcurrentHashMap<String, MutableSet<String>>()

    /** Records intent to subscribe, before the SDK returns a [Disposable]. */
    fun markPending(subscriptionId: String, instanceId: String) {
        states[subscriptionId] = Pending(instanceId)
        byInstance.computeIfAbsent(instanceId) { ConcurrentHashMap.newKeySet() }.add(subscriptionId)
    }

    /**
     * Attaches the SDK [disposable] once the subscription is live. If the entry
     * was tombstoned meanwhile (unsubscribe/shutdown raced ahead), the
     * [disposable] is disposed immediately and never stored.
     */
    fun register(subscriptionId: String, instanceId: String, disposable: Disposable) {
        val resolved = states.compute(subscriptionId) { _, current ->
            if (current is Tombstoned) null else Active(instanceId, disposable)
        }
        if (resolved == null) {
            disposable.dispose()
            byInstance[instanceId]?.remove(subscriptionId)
        }
    }

    /** Drops a still-[Pending] subscription whose instance was not found. */
    fun cancelPending(subscriptionId: String, instanceId: String) {
        states.remove(subscriptionId)
        byInstance[instanceId]?.remove(subscriptionId)
    }

    /**
     * Terminal collapse for unsubscribe / shutdown / stream completion. Active →
     * dispose once and drop; Pending → tombstone (so a later [register] disposes
     * the late [Disposable]); Tombstoned/absent → no-op.
     */
    fun teardown(subscriptionId: String) {
        var doomed: Active? = null
        states.compute(subscriptionId) { _, current ->
            when (current) {
                is Active -> { doomed = current; null }
                is Pending -> Tombstoned
                else -> current
            }
        }
        doomed?.let {
            it.disposable.dispose()
            byInstance[it.instanceId]?.remove(subscriptionId)
        }
    }

    /**
     * Disposes every subscription for [instanceId] on shutdown. Load-bearing on
     * Android: `Tealium.shutdown` never emits `onComplete`, so without this the
     * SDK subscriptions would leak.
     */
    fun disposeAllForInstance(instanceId: String) {
        val ids = byInstance.remove(instanceId) ?: return
        val doomed = ArrayList<Disposable>(ids.size)
        for (id in ids) {
            states.compute(id) { _, current ->
                when (current) {
                    is Active -> { doomed.add(current.disposable); null }
                    is Pending -> Tombstoned
                    else -> current
                }
            }
        }
        doomed.forEach { it.dispose() }
    }
}
