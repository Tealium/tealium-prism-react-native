require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "TealiumPrismReactNativeExtensions"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/Tealium/tealium-prism-react-native.git", :tag => "#{s.version}" }

  # No wrapper source of its own: pulling in the Extensions subspec is enough.
  # Its ObjC `+load` loader (ExtensionsClassesLoader) registers the transformer
  # factories with every Tealium instance at launch — no app code required.
  s.dependency "tealium-prism/Extensions", "~> 0.6"
end
