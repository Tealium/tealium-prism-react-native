package com.tealiumprismlifecyclereactnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.tealium.prism.core.api.Tealium
import com.tealium.prism.core.api.TealiumConfig
import com.tealium.prism.core.api.data.DataObject
import com.tealium.prism.lifecycle.Lifecycle
import com.tealium.prism.lifecycle.LifecycleDataTarget
import com.tealium.prism.lifecycle.LifecycleEvent
import com.tealium.prism.lifecycle.lifecycle
import com.tealiumprismreactnative.BridgeModule
import com.tealiumprismreactnative.TealiumPrismReactNativeModule

/**
 * Implements BridgeModule (configure, called before Tealium.create()) and
 * NativeTealiumPrismLifecycleSpec (runtime launch/wake/sleep API).
 */
class BridgeModuleLifecycle(reactContext: ReactApplicationContext)
    : NativeTealiumPrismLifecycleSpec(reactContext), BridgeModule {

    // Called by RN at app startup — registers with the core bridge registry
    // BEFORE JS ever calls Tealium.create().
    override fun initialize() {
        super.initialize()
        TealiumPrismReactNativeModule.registerBridgeModule(this)
    }

    // Called by TealiumPrismReactNativeModule.initialize() before Tealium.create().
    // Reads the 'lifecycle' key from jsConfig and adds the Lifecycle module to the builder.
    override fun configure(builder: TealiumConfig.Builder, jsConfig: ReadableMap) {
        if (!jsConfig.hasKey("lifecycle")) return
        val lc = jsConfig.getMap("lifecycle") ?: return
        builder.addModule(Lifecycle.configure { b ->
            if (lc.hasKey("autoTracking")) {
                b.setAutoTrackingEnabled(lc.getBoolean("autoTracking"))
            }
            if (lc.hasKey("sessionTimeoutInMinutes")) {
                b.setSessionTimeoutInMinutes(lc.getInt("sessionTimeoutInMinutes"))
            }
            lc.getString("dataTarget")?.let { t ->
                b.setDataTarget(
                    if (t == "allEvents") LifecycleDataTarget.AllEvents
                    else LifecycleDataTarget.LifecycleEventsOnly
                )
            }
            lc.getArray("trackedLifecycleEvents")?.let { arr ->
                val events = (0 until arr.size()).mapNotNull { i ->
                    when (arr.getString(i)) {
                        "launch" -> LifecycleEvent.Launch
                        "wake" -> LifecycleEvent.Wake
                        "sleep" -> LifecycleEvent.Sleep
                        else -> null
                    }
                }
                if (events.isNotEmpty()) b.setTrackedLifecycleEvents(events)
            }
            b
        })
    }

    // MARK: - Runtime API

    override fun lifecycleLaunch(instanceKey: String, data: ReadableMap?, promise: Promise) {
        Tealium.get(instanceKey) { tealium ->
            tealium?.lifecycle?.launch(data.toDataObject())?.subscribe { result ->
                if (result.isSuccess) promise.resolve(null)
                else promise.reject("LIFECYCLE_ERROR", result.exceptionOrNull()?.message ?: "launch failed")
            } ?: promise.reject("NOT_INITIALIZED", "Tealium instance '$instanceKey' not found")
        }
    }

    override fun lifecycleWake(instanceKey: String, data: ReadableMap?, promise: Promise) {
        Tealium.get(instanceKey) { tealium ->
            tealium?.lifecycle?.wake(data.toDataObject())?.subscribe { result ->
                if (result.isSuccess) promise.resolve(null)
                else promise.reject("LIFECYCLE_ERROR", result.exceptionOrNull()?.message ?: "wake failed")
            } ?: promise.reject("NOT_INITIALIZED", "Tealium instance '$instanceKey' not found")
        }
    }

    override fun lifecycleSleep(instanceKey: String, data: ReadableMap?, promise: Promise) {
        Tealium.get(instanceKey) { tealium ->
            tealium?.lifecycle?.sleep(data.toDataObject())?.subscribe { result ->
                if (result.isSuccess) promise.resolve(null)
                else promise.reject("LIFECYCLE_ERROR", result.exceptionOrNull()?.message ?: "sleep failed")
            } ?: promise.reject("NOT_INITIALIZED", "Tealium instance '$instanceKey' not found")
        }
    }

    companion object {
        const val NAME = "TealiumPrismLifecycle"
    }
}

private fun ReadableMap?.toDataObject(): DataObject =
    this?.toHashMap()?.let { DataObject.fromMap(it) } ?: DataObject.EMPTY_OBJECT
