require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "TealiumPrismReactNative"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/Tealium/tealium-prism-react-native.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift,cpp}"
  s.private_header_files = "ios/**/*.h"
  
  s.swift_version = "5.0"

  s.pod_target_xcconfig = {
    "CLANG_ENABLE_OBJC_ARC" => "YES"
  }

  # Tealium Prism Swift SDK
  # https://github.com/Tealium/tealium-prism-swift
  s.dependency "tealium-prism/Core", "~> 0.4.0"

  install_modules_dependencies(s)
end
