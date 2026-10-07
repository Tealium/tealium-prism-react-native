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

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.private_header_files = "ios/**/*.h"
  # Unit tests live under ios/Tests and belong to the test_spec target, not the
  # library. exclude_files keeps them out of the shipped pod; it is not inherited
  # by test specs, so the test_spec below still picks them up.
  s.exclude_files = "ios/Tests/**/*"

  install_modules_dependencies(s)
  s.dependency "tealium-prism/Core", "~> 0.6"

  # Pure-logic unit tests for the wrapper (e.g. the SubscriptionStore state
  # machine). CocoaPods generates a test target in Pods.xcodeproj on `pod
  # install`; run it via that scheme or `pod lib lint`. Tests use
  # `@testable import TealiumPrismReactNative` to reach the library's internal
  # types and inherit the parent's TealiumPrism dependency.
  s.test_spec "Tests" do |test_spec|
    test_spec.test_type = :unit
    test_spec.source_files = "ios/Tests/**/*.swift"
    test_spec.requires_app_host = false
  end
end
