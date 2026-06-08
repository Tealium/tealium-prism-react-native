require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "TealiumPrismLifecycle"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/Tealium/tealium-prism-react-native.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.private_header_files = "ios/**/*.h"

  s.swift_version = "5.0"

  s.pod_target_xcconfig = {
    "CLANG_ENABLE_OBJC_ARC" => "YES"
  }

  # Core RN bridge — provides BridgeModule protocol and TealiumPrismBridge.shared
  s.dependency "TealiumPrismReactNative"
  # Tealium Prism Swift Lifecycle module
  s.dependency "tealium-prism/Lifecycle", "~> 0.5.0"

  install_modules_dependencies(s)
end
