package com.tealiumprismreactnative

import com.facebook.react.bridge.ReadableMap
import com.tealium.prism.core.api.TealiumConfig

/**
 * Contract for optional RN packages (lifecycle, momentsapi, etc.) to contribute their
 * native module configuration to the core bridge before Tealium.create() is called.
 *
 * Each package implements this interface and registers itself via
 * TealiumPrismReactNativeModule.registerBridgeModule() inside override fun initialize().
 * The core bridge calls configure() on every registered module before creating the Tealium instance.
 */
interface BridgeModule {
    fun configure(builder: TealiumConfig.Builder, jsConfig: ReadableMap)
}
