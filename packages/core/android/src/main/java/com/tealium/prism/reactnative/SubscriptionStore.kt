package com.tealium.prism.reactnative

import com.tealium.prism.core.api.pubsub.Disposable

/**
 * Tracks the lifecycle of native DataLayer subscriptions, keyed by the opaque
 * `subscriptionId` JS mints. The Android mirror of the iOS `SubscriptionStore`.
 *
 * Every promise-backed and event-backed call can run on an arbitrary Tealium
 * thread while JS `unsubscribe`/`shutdown` calls arrive on their own thread, so
 * all state is serialized on a single [lock]: the [states] and [byInstance]
 * maps only ever mutate together inside the critical section, so a multi-map
 * operation can never interleave with another (a per-key [java.util.concurrent.ConcurrentHashMap]
 * would leave a window where `states` holds an entry `byInstance` does not yet,
 * letting shutdown miss it). Each mutation computes the [Disposable]s to dispose
 * inside the critical section but calls `dispose()` *outside* it, so a dispose
 * can never re-enter the lock.
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

    private val lock = Any()
    private val states = HashMap<String, State>()
    private val byInstance = HashMap<String, MutableSet<String>>()

    /** Records intent to subscribe, before the SDK returns a [Disposable]. */
    fun markPending(subscriptionId: String, instanceId: String) {
        synchronized(lock) {
            states[subscriptionId] = Pending(instanceId)
            byInstance.getOrPut(instanceId) { mutableSetOf() }.add(subscriptionId)
        }
    }

    /**
     * Attaches the SDK [disposable] once the subscription is live. If the entry
     * was tombstoned meanwhile (unsubscribe/shutdown raced ahead), the
     * [disposable] is disposed immediately and never stored.
     */
    fun register(subscriptionId: String, instanceId: String, disposable: Disposable) {
        val tombstoned = synchronized(lock) {
            if (states[subscriptionId] is Tombstoned) {
                states.remove(subscriptionId)
                byInstance[instanceId]?.remove(subscriptionId)
                true
            } else {
                states[subscriptionId] = Active(instanceId, disposable)
                false
            }
        }
        if (tombstoned) disposable.dispose()
    }

    /** Drops a still-[Pending] subscription whose instance was not found. */
    fun cancelPending(subscriptionId: String, instanceId: String) {
        synchronized(lock) {
            states.remove(subscriptionId)
            byInstance[instanceId]?.remove(subscriptionId)
        }
    }

    /**
     * Terminal collapse for unsubscribe / shutdown / stream completion. Active →
     * dispose once and drop; Pending → tombstone (so a later [register] disposes
     * the late [Disposable]); Tombstoned/absent → no-op.
     */
    fun teardown(subscriptionId: String) {
        val doomed = synchronized(lock) {
            when (val current = states[subscriptionId]) {
                is Active -> {
                    states.remove(subscriptionId)
                    byInstance[current.instanceId]?.remove(subscriptionId)
                    current.disposable
                }
                is Pending -> {
                    states[subscriptionId] = Tombstoned
                    null
                }
                else -> null
            }
        }
        doomed?.dispose()
    }

    /**
     * Disposes every subscription for [instanceId] on shutdown. Load-bearing on
     * Android: `Tealium.shutdown` never emits `onComplete`, so without this the
     * SDK subscriptions would leak.
     */
    fun disposeAllForInstance(instanceId: String) {
        val doomed = synchronized(lock) {
            val ids = byInstance.remove(instanceId) ?: return@synchronized emptyList<Disposable>()
            val result = ArrayList<Disposable>(ids.size)
            for (id in ids) {
                when (val current = states[id]) {
                    is Active -> {
                        states.remove(id)
                        result.add(current.disposable)
                    }
                    is Pending -> states[id] = Tombstoned
                    else -> {}
                }
            }
            result
        }
        doomed.forEach { it.dispose() }
    }

    /**
     * Disposes every tracked subscription across all instances, for JS runtime teardown
     * (dev reload, host recreating the React instance). Same atomicity and dispose-outside-
     * lock pattern as [disposeAllForInstance], widened to every instance instead of one:
     * still-[Pending] entries are tombstoned (rather than dropped) so a later [register]
     * disposes the incoming [Disposable].
     */
    fun disposeAll() {
        val doomed = synchronized(lock) {
            val result = ArrayList<Disposable>()
            for (id in states.keys.toList()) {
                when (val current = states[id]) {
                    is Active -> {
                        states.remove(id)
                        result.add(current.disposable)
                    }
                    is Pending -> states[id] = Tombstoned
                    else -> {}
                }
            }
            byInstance.clear()
            result
        }
        doomed.forEach { it.dispose() }
    }
}
