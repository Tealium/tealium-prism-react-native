require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "TealiumPrismReactNativeJavaScriptTransformer"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/Tealium/tealium-prism-react-native.git", :tag => "#{s.version}" }

  # No wrapper source of its own: the JavaScriptTransformer subspec (backed by
  # the OS-provided JavaScriptCore) ships an ObjC `+load` loader that registers
  # the transformer factory with every Tealium instance at launch. On iOS there
  # is no separate JS engine dependency to add — unlike Android's Rhino package.
  s.dependency "tealium-prism/JavaScriptTransformer", "~> 0.5"
end
