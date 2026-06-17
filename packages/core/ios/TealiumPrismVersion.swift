import Foundation
import TealiumPrism

 @objc(TealiumPrismVersion)
 public final class TealiumPrismVersion: NSObject {
   @objc public static var sdkVersion: String {
     TealiumConstants.libraryVersion
   }
 }
