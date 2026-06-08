package com.tealiumprismlifecyclereactnative

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class TealiumPrismLifecyclePackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == BridgeModuleLifecycle.NAME) BridgeModuleLifecycle(reactContext) else null

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider {
            mapOf(
                BridgeModuleLifecycle.NAME to ReactModuleInfo(
                    BridgeModuleLifecycle.NAME,
                    BridgeModuleLifecycle.NAME,
                    false,
                    false,
                    false,
                    true
                )
            )
        }
}
