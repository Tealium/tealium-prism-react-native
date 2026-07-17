package com.tealium.prism.reactnative.jstransformer.rhino

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * Autolinking anchor for the Rhino JavaScript engine.
 *
 * This package exposes no TurboModules; it exists solely so React Native's
 * autolinking includes this Gradle project, which in turn brings in the
 * `prism-js-transformer-rhino` AAR (and the base transformer transitively).
 * That AAR registers the Rhino transformer factory automatically via its
 * `ComponentDiscoveryService` manifest entry, so no app-side wiring is required.
 */
class TealiumPrismJavaScriptTransformerRhinoPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider { emptyMap() }
}
