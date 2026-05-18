package com.tealiumprismreactnative.trace

import com.facebook.react.bridge.Promise
import com.tealium.prism.core.api.Tealium

internal class TraceDelegate(private val getTealium: () -> Tealium?) {

    // MARK: - Trace

    fun join(traceId: String) {
        getTealium()?.trace?.join(traceId)
    }

    fun leave() {
        getTealium()?.trace?.leave()
    }

    fun forceEndOfVisit() {
        getTealium()?.trace?.forceEndOfVisit()
    }

    // MARK: - Visitor

    fun resetVisitorId(promise: Promise) {
        val teal = getTealium() ?: run { promise.reject("NOT_INITIALIZED", "Tealium is not initialized"); return }
        teal.resetVisitorId().subscribe { result ->
            val newId = result.getOrNull()
            if (newId != null) promise.resolve(newId)
            else {
                val err = result.exceptionOrNull()
                promise.reject("RESET_ERROR", err?.message ?: "Failed to reset visitor ID", err)
            }
        }
    }

    fun clearStoredVisitorIds(promise: Promise) {
        val teal = getTealium() ?: run { promise.reject("NOT_INITIALIZED", "Tealium is not initialized"); return }
        teal.clearStoredVisitorIds().subscribe { result ->
            val newId = result.getOrNull()
            if (newId != null) promise.resolve(newId)
            else {
                val err = result.exceptionOrNull()
                promise.reject("CLEAR_ERROR", err?.message ?: "Failed to clear stored visitor IDs", err)
            }
        }
    }

    // MARK: - Deep Link

    fun handle(url: String, referrer: String?, promise: Promise) {
        val teal = getTealium() ?: run { promise.reject("NOT_INITIALIZED", "Tealium is not initialized"); return }
        val deepLinkUri = android.net.Uri.parse(url)
        if (deepLinkUri.scheme == null) {
            promise.resolve(false)
            return
        }
        val referrerUri = referrer?.let { android.net.Uri.parse(it) }
        teal.deeplink.handle(deepLinkUri, referrerUri).subscribe { result ->
            promise.resolve(result.isSuccess)
        }
    }
}
