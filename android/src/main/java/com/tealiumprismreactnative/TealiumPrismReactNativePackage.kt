package com.tealiumprismreactnative

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class TealiumPrismReactNativePackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == TealiumPrismReactNativeModule.NAME) {
      TealiumPrismReactNativeModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      mapOf(
        TealiumPrismReactNativeModule.NAME to ReactModuleInfo(
          TealiumPrismReactNativeModule.NAME,
          TealiumPrismReactNativeModule.NAME,
          false,
          false,
          false,
          true
        )
      )
    }
  }
}
