package com.tealium.prism.reactnative.extensions

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * Autolinking anchor for the Prism Extensions module.
 *
 * This package exposes no TurboModules; it exists solely so React Native's
 * autolinking includes this Gradle project, which in turn brings in the
 * `prism-extensions` AAR. That AAR registers its transformer factories
 * automatically via its `ComponentDiscoveryService` manifest entries, so no
 * app-side wiring is required.
 */
class TealiumPrismExtensionsPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider { emptyMap() }
}
