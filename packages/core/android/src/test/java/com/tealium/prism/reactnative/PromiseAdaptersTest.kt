package com.tealium.prism.reactnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.tealium.prism.core.api.data.DataItem
import com.tealium.prism.core.api.misc.TealiumResult
import com.tealium.prism.core.api.pubsub.Disposable
import com.tealium.prism.core.api.pubsub.Disposables
import com.tealium.prism.core.api.pubsub.Observer
import com.tealium.prism.core.api.pubsub.Single
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Unit tests for the bridge's `SingleResult` -> `Promise` adapters, which every promise-returning
 * bridge method goes through. Robolectric provides the Android `org.json` implementation that
 * Prism's `DataItem.toString()` relies on to JSON-encode the resolved value.
 *
 * The SDK level is pinned because this module's `targetSdkVersion` (36) is newer than the highest
 * level Robolectric 4.13 ships images for; the adapters under test are SDK-level independent.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class PromiseAdaptersTest {

    @Test
    fun test_subscribe_with_string_success_resolves_with_json_encoded_string() {
        val promise = RecordingPromise()

        FakeSingle(TealiumResult.success("visitor-123")).subscribe(promise) { DataItem.string(it) }

        assertTrue(promise.resolved)
        assertEquals("\"visitor-123\"", promise.resolvedValue)
        assertFalse(promise.rejected)
    }

    @Test
    fun test_subscribe_with_failure_rejects_with_prism_native_error() {
        val promise = RecordingPromise()
        val error = RuntimeException("boom")

        FakeSingle(TealiumResult.failure<String>(error)).subscribe(promise) { DataItem.string(it) }

        assertTrue(promise.rejected)
        assertEquals(ErrorCode.PRISM_NATIVE_ERROR, promise.rejectedCode)
        assertEquals("boom", promise.rejectedMessage)
        assertSame(error, promise.rejectedThrowable)
        assertFalse(promise.resolved)
    }

    @Test
    fun test_subscribe_with_completion_without_emission_rejects_with_tealium_cancelled() {
        val promise = RecordingPromise()

        FakeSingle<TealiumResult<String>>().subscribe(promise) { DataItem.string(it) }

        assertTrue(promise.rejected)
        assertEquals(ErrorCode.TEALIUM_CANCELLED, promise.rejectedCode)
        assertFalse(promise.resolved)
    }

    @Test
    fun test_subscribeVoid_with_success_resolves_with_null() {
        val promise = RecordingPromise()

        FakeSingle(TealiumResult.success(Unit)).subscribeVoid(promise)

        assertTrue(promise.resolved)
        assertNull(promise.resolvedValue)
        assertFalse(promise.rejected)
    }

    @Test
    fun test_subscribeVoid_with_failure_rejects_with_prism_native_error() {
        val promise = RecordingPromise()

        FakeSingle(TealiumResult.failure<Unit>(RuntimeException("boom"))).subscribeVoid(promise)

        assertTrue(promise.rejected)
        assertEquals(ErrorCode.PRISM_NATIVE_ERROR, promise.rejectedCode)
        assertFalse(promise.resolved)
    }

    @Test
    fun test_subscribeNullable_with_null_conversion_resolves_with_null() {
        val promise = RecordingPromise()

        FakeSingle(TealiumResult.success("absent")).subscribeNullable(promise) { null }

        assertTrue(promise.resolved)
        assertNull(promise.resolvedValue)
        assertFalse(promise.rejected)
    }

    @Test
    fun test_subscribeNullable_with_stored_null_resolves_with_json_null_string() {
        val promise = RecordingPromise()

        FakeSingle(TealiumResult.success("stored")).subscribeNullable(promise) { DataItem.NULL }

        assertTrue(promise.resolved)
        assertEquals("null", promise.resolvedValue)
        assertFalse(promise.rejected)
    }

    /**
     * A [Single] that synchronously emits [emissions] in order, then completes, on subscription.
     */
    private class FakeSingle<T>(private vararg val emissions: T) : Single<T> {
        override fun subscribe(observer: Observer<T>): Disposable {
            emissions.forEach(observer::onNext)
            observer.onComplete()
            return Disposables.disposed()
        }
    }

    /**
     * A [Promise] that records the first resolve or reject, so tests can assert on it without
     * React Native's `PromiseImpl`, which builds a native `WritableMap` on reject.
     */
    private class RecordingPromise : Promise {
        var resolved = false
        var resolvedValue: Any? = null
        var rejected = false
        var rejectedCode: String? = null
        var rejectedMessage: String? = null
        var rejectedThrowable: Throwable? = null

        override fun resolve(value: Any?) {
            resolved = true
            resolvedValue = value
        }

        override fun reject(code: String?, message: String?) =
            record(code, message, null)

        override fun reject(code: String?, throwable: Throwable?) =
            record(code, throwable?.message, throwable)

        override fun reject(code: String?, message: String?, throwable: Throwable?) =
            record(code, message, throwable)

        override fun reject(throwable: Throwable) =
            record(null, throwable.message, throwable)

        override fun reject(throwable: Throwable, userInfo: WritableMap) =
            record(null, throwable.message, throwable)

        override fun reject(code: String?, userInfo: WritableMap) =
            record(code, null, null)

        override fun reject(code: String?, throwable: Throwable?, userInfo: WritableMap) =
            record(code, throwable?.message, throwable)

        override fun reject(code: String?, message: String?, userInfo: WritableMap) =
            record(code, message, null)

        override fun reject(
            code: String?,
            message: String?,
            throwable: Throwable?,
            userInfo: WritableMap?
        ) = record(code, message, throwable)

        @Deprecated("Prefer passing a module-specific error code to JS.")
        override fun reject(message: String) =
            record(null, message, null)

        private fun record(code: String?, message: String?, throwable: Throwable?) {
            rejected = true
            rejectedCode = code
            rejectedMessage = message
            rejectedThrowable = throwable
        }
    }
}
