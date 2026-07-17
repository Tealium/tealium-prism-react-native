package com.tealium.prism.reactnative.jstransformer

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * Autolinking anchor for the base Prism JavaScript transformer module.
 *
 * This package exposes no TurboModules; it exists solely so React Native's
 * autolinking includes this Gradle project, which in turn brings in the
 * `prism-js-transformer` AAR. Running scripts on Android also requires a JS
 * engine — see `@tealium/prism-react-native-js-transformer-rhino`.
 */
class TealiumPrismJavaScriptTransformerPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider { emptyMap() }
}
