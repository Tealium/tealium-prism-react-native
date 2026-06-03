package com.tealiumprismreactnative.trace

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.tealium.prism.core.api.Tealium
import com.tealiumprismreactnative.ERROR_CLEAR
import com.tealiumprismreactnative.ERROR_NOT_INITIALIZED
import com.tealiumprismreactnative.ERROR_RESET
import com.tealiumprismreactnative.ERROR_TRACE
import com.tealiumprismreactnative.MSG_NOT_INITIALIZED
import com.tealiumprismreactnative.datalayer.toWritableMap

internal class TraceDelegate(private val getTealium: () -> Tealium?) {

    // MARK: - Trace

    fun join(traceId: String, promise: Promise) {
        val teal = getTealium()
        if (teal == null) { promise.reject(ERROR_NOT_INITIALIZED, MSG_NOT_INITIALIZED); return }
        teal.trace.join(traceId).subscribe { result ->
            result.onSuccess { promise.resolve(null) }
                  .onFailure { err -> promise.reject(ERROR_TRACE, err.message ?: "Failed to join trace", err) }
        }
    }

    fun leave(promise: Promise) {
        val teal = getTealium()
        if (teal == null) { promise.reject(ERROR_NOT_INITIALIZED, MSG_NOT_INITIALIZED); return }
        teal.trace.leave().subscribe { result ->
            result.onSuccess { promise.resolve(null) }
                  .onFailure { err -> promise.reject(ERROR_TRACE, err.message ?: "Failed to leave trace", err) }
        }
    }

    fun forceEndOfVisit(promise: Promise) {
        val teal = getTealium()
        if (teal == null) { promise.reject(ERROR_NOT_INITIALIZED, MSG_NOT_INITIALIZED); return }
        teal.trace.forceEndOfVisit().subscribe { result ->
            val trackResult = result.getOrNull()
            if (trackResult != null) {
                val dispatch = trackResult.dispatch
                val map = Arguments.createMap().apply {
                    putString("status", trackResult.status.name.lowercase())
                    putString("info", trackResult.info)
                    putMap("dispatch", Arguments.createMap().apply {
                        putString("id", dispatch.id)
                        putDouble("timestamp", dispatch.timestamp.toDouble())
                        putMap("payload", dispatch.payload().toWritableMap())
                    })
                }
                promise.resolve(map)
            } else {
                val err = result.exceptionOrNull()
                promise.reject(ERROR_TRACE, err?.message ?: "Force end of visit failed", err)
            }
        }
    }

    // MARK: - Visitor

    fun resetVisitorId(promise: Promise) {
        val teal = getTealium() ?: run { promise.reject(ERROR_NOT_INITIALIZED, MSG_NOT_INITIALIZED); return }
        teal.resetVisitorId().subscribe { result ->
            val newId = result.getOrNull()
            if (newId != null) promise.resolve(newId)
            else {
                val err = result.exceptionOrNull()
                promise.reject(ERROR_RESET, err?.message ?: "Failed to reset visitor ID", err)
            }
        }
    }

    fun clearStoredVisitorIds(promise: Promise) {
        val teal = getTealium() ?: run { promise.reject(ERROR_NOT_INITIALIZED, MSG_NOT_INITIALIZED); return }
        teal.clearStoredVisitorIds().subscribe { result ->
            val newId = result.getOrNull()
            if (newId != null) promise.resolve(newId)
            else {
                val err = result.exceptionOrNull()
                promise.reject(ERROR_CLEAR, err?.message ?: "Failed to clear stored visitor IDs", err)
            }
        }
    }

    // MARK: - Deep Link

    fun handle(url: String, referrer: String?, promise: Promise) {
        val teal = getTealium() ?: run { promise.reject(ERROR_NOT_INITIALIZED, MSG_NOT_INITIALIZED); return }
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
