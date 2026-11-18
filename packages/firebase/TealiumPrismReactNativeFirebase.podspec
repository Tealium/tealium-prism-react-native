require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "TealiumPrismReactNativeFirebase"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/Tealium/tealium-prism-react-native.git", :tag => "#{s.version}" }

  # No wrapper source of its own: pulling in the TealiumPrismFirebase pod is enough.
  # Its ObjC `+load` loader (FirebaseClassesLoader, which calls
  # FirebaseAutomaticLoader.setup) registers the Firebase dispatcher factory as a
  # default module at launch — no app code required. The module only starts when
  # Tealium settings contain a `FirebaseDispatcher` entry.
  s.dependency "TealiumPrismFirebase", "~> 0.2"
end
