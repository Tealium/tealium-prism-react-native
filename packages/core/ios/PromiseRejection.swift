import Foundation

/// Typed container for the three arguments React Native's `reject` callback expects.
///
/// Bridge methods use `(String?, PromiseRejection?) -> Void` completions so error details
/// can be easily assembled in Swift.
@objcMembers
public class PromiseRejection: NSObject, @unchecked Sendable {
    /// Machine-readable error code passed as the first argument to RN's `reject`.
    public let code: String
    /// Human-readable description passed as the second argument to RN's `reject`.
    public let message: String
    /// Underlying Swift error, if any, passed as the third argument to RN's `reject`.
    public let error: Error?

    init(code: ErrorCode, message: String, error: Error? = nil) {
        self.code = code.rawValue
        self.message = message
        self.error = error
    }

    /// Convenience initialiser that derives `message` from `error.localizedDescription`.
    convenience init(code: ErrorCode, error: Error) {
        self.init(code: code, message: error.localizedDescription, error: error)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
