import TealiumPrism

// Importing TealiumPrism proves the SDK is linked at compile time.
// If the tealium-prism pod dep is absent, this import fails the Swift compile.
// The version value is sourced from TealiumConstants.libraryVersion.
let _prismSdkVersion: String = TealiumConstants.libraryVersion
