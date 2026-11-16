package com.tealium.prism.reactnative.firebase

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * Autolinking anchor for the Prism Firebase dispatcher.
 *
 * This package exposes no TurboModules; it exists solely so React Native's
 * autolinking includes this Gradle project, which in turn brings in the
 * `com.tealium.prism:firebase` AAR. That AAR registers its dispatcher factory
 * automatically via its `ComponentDiscoveryService` manifest entry, so no
 * app-side wiring is required. Dispatcher behaviour is controlled by the
 * `FirebaseDispatcher` entry in local/remote JSON settings.
 */
class TealiumPrismFirebasePackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider { emptyMap() }
}
