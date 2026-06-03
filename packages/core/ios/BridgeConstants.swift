//
//  BridgeConstants.swift
//  TealiumPrismReactNative
//

let bridgeLogTag = "[TealiumPrismReactNative]"
let bridgeErrorDomain = "TealiumPrism"
let bridgeErrorNotInitialized = "Tealium is not initialized"
let bridgeErrorConsentNotEnabled = "Consent integration not enabled"
/// NSError userInfo key carrying the JS-facing error code string (e.g. "INVALID_DECISION_TYPE").
/// Used by the .mm layer to route errors without brittle message string matching.
let bridgeErrorCodeKey = "TealiumBridgeErrorCode"
