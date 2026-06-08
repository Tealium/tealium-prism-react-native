//
//  BridgeModule.swift
//  TealiumPrismReactNative
//
//  Contract for optional RN packages (lifecycle, momentsapi, etc.) to contribute their
//  native module configuration to the core bridge before Tealium.create() is called.
//
//  Each package implements this protocol and registers itself via
//  TealiumPrismBridge.registerBridgeModule() inside override init().
//  The core bridge calls configure() on every registered module before creating the Tealium instance.
//

import TealiumPrism

public protocol BridgeModule: AnyObject {
    func configure(_ config: inout TealiumConfig, jsConfig: NSDictionary)
}
