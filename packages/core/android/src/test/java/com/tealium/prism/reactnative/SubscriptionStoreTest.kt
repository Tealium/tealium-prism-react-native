package com.tealium.prism.reactnative

import com.tealium.prism.core.api.pubsub.Disposable
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Records dispose calls so tests can assert exactly-once teardown. */
private class FakeDisposable : Disposable {
    var disposeCount = 0
        private set

    override var isDisposed = false
        private set

    override fun dispose() {
        disposeCount++
        isDisposed = true
    }
}

class SubscriptionStoreTest {

    @Test
    fun register_afterMarkPending_storesDisposableWithoutDisposing() {
        val store = SubscriptionStore()
        val disposable = FakeDisposable()

        store.markPending("s1", "i1")
        store.register("s1", "i1", disposable)

        assertEquals(0, disposable.disposeCount)
        assertFalse(disposable.isDisposed)
    }

    @Test
    fun teardown_afterRegister_disposesExactlyOnce() {
        val store = SubscriptionStore()
        val disposable = FakeDisposable()
        store.markPending("s1", "i1")
        store.register("s1", "i1", disposable)

        store.teardown("s1")
        store.teardown("s1")

        assertEquals(1, disposable.disposeCount)
        assertTrue(disposable.isDisposed)
    }

    @Test
    fun teardown_beforeRegister_disposesLateDisposableExactlyOnce() {
        val store = SubscriptionStore()
        val disposable = FakeDisposable()
        store.markPending("s1", "i1")

        // Unsubscribe arrives before the SDK returns the disposable: the entry is
        // tombstoned, then the late register disposes it immediately.
        store.teardown("s1")
        store.register("s1", "i1", disposable)

        assertEquals(1, disposable.disposeCount)
        assertTrue(disposable.isDisposed)
    }

    @Test
    fun disposeAllForInstance_beforeRegister_disposesLateDisposable() {
        val store = SubscriptionStore()
        val disposable = FakeDisposable()
        store.markPending("s1", "i1")

        // Shutdown arrives before register: tombstone, then dispose on register.
        store.disposeAllForInstance("i1")
        store.register("s1", "i1", disposable)

        assertEquals(1, disposable.disposeCount)
        assertTrue(disposable.isDisposed)
    }

    @Test
    fun cancelPending_thenTeardown_isNoOp() {
        val store = SubscriptionStore()
        val disposable = FakeDisposable()
        // Instance not found: the pending entry is dropped. teardown must then not
        // tombstone the dropped id, so a fresh register for it stays active instead
        // of being disposed.
        store.markPending("s1", "i1")
        store.cancelPending("s1", "i1")
        store.teardown("s1")
        store.register("s1", "i1", disposable)

        assertEquals(0, disposable.disposeCount)
        assertFalse(disposable.isDisposed)
    }

    @Test
    fun disposeAllForInstance_disposesOnlyThatInstance() {
        val store = SubscriptionStore()
        val disposableA = FakeDisposable()
        val disposableB = FakeDisposable()
        store.markPending("sA", "iA")
        store.register("sA", "iA", disposableA)
        store.markPending("sB", "iB")
        store.register("sB", "iB", disposableB)

        store.disposeAllForInstance("iA")

        assertEquals(1, disposableA.disposeCount)
        assertEquals(0, disposableB.disposeCount)
    }

    @Test
    fun disposeAllForInstance_disposesEveryActiveSubscriptionOnce() {
        val store = SubscriptionStore()
        val disposable1 = FakeDisposable()
        val disposable2 = FakeDisposable()
        store.markPending("s1", "i1")
        store.register("s1", "i1", disposable1)
        store.markPending("s2", "i1")
        store.register("s2", "i1", disposable2)

        store.disposeAllForInstance("i1")
        store.disposeAllForInstance("i1") // second call must be a no-op

        assertEquals(1, disposable1.disposeCount)
        assertEquals(1, disposable2.disposeCount)
    }

    @Test
    fun disposeAll_disposesEveryActiveSubscriptionAcrossAllInstances() {
        val store = SubscriptionStore()
        val disposableA = FakeDisposable()
        val disposableB = FakeDisposable()
        val pendingDisposable = FakeDisposable()
        store.markPending("sA", "iA")
        store.register("sA", "iA", disposableA)
        store.markPending("sB", "iB")
        store.register("sB", "iB", disposableB)
        store.markPending("sC", "iC")

        store.disposeAll()

        assertEquals(1, disposableA.disposeCount)
        assertEquals(1, disposableB.disposeCount)

        // The still-pending subscription is tombstoned: a late register disposes the
        // incoming disposable immediately, matching disposeAllForInstance's behavior.
        store.register("sC", "iC", pendingDisposable)

        assertEquals(1, pendingDisposable.disposeCount)
        assertTrue(pendingDisposable.isDisposed)
    }

    @Test
    fun teardown_unknownSubscription_isNoOp() {
        val store = SubscriptionStore()
        val disposable = FakeDisposable()

        // teardown of an id never seen must not create a tombstone: a later
        // register for that id stays active instead of being disposed.
        store.teardown("never-registered")
        store.register("never-registered", "i1", disposable)

        assertEquals(0, disposable.disposeCount)
        assertFalse(disposable.isDisposed)
    }
}
