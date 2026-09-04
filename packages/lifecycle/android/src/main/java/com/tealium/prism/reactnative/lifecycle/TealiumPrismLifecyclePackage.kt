package com.tealium.prism.reactnative.lifecycle

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * Autolinking anchor for the Prism Lifecycle module.
 *
 * This package exposes no TurboModules; it exists solely so React Native's
 * autolinking includes this Gradle project, which in turn brings in the
 * `prism-lifecycle` AAR. That AAR registers its module factory automatically
 * via its `ComponentDiscoveryService` manifest entry, so no app-side wiring is
 * required. Lifecycle behaviour is controlled by local/remote JSON settings.
 */
class TealiumPrismLifecyclePackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider { emptyMap() }
}
