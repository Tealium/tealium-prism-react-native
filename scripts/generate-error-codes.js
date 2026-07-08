#!/usr/bin/env node
// Generates typed ErrorCodes constants for Kotlin, Swift, and TypeScript from
// packages/core/error-codes.json. Run via: node scripts/generate-error-codes.js

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const codes = JSON.parse(
  fs.readFileSync(path.join(root, "packages/core/error-codes.json"), "utf8")
);

const header = "// Generated from error-codes.json — do not edit manually";

// Kotlin
const ktLines = [
  header,
  "package com.tealium.prism.reactnative",
  "",
  "internal object ErrorCodes {",
  ...codes.map((c) => `    const val ${c} = "${c}"`),
  "}",
  "",
];
fs.writeFileSync(
  path.join(
    root,
    "packages/core/android/src/main/java/com/tealium/prism/reactnative/ErrorCodes.kt"
  ),
  ktLines.join("\n")
);

// Swift
const swiftLines = [
  header,
  "enum ErrorCodes: String {",
  ...codes.map((c) => `    case ${c}`),
  "}",
  "",
];
fs.writeFileSync(
  path.join(root, "packages/core/ios/ErrorCodes.swift"),
  swiftLines.join("\n")
);

// TypeScript
const tsLines = [
  header,
  "export const ErrorCodes = {",
  ...codes.map((c) => `  ${c}: "${c}",`),
  "} as const;",
  "",
];
fs.writeFileSync(
  path.join(root, "packages/core/src/ErrorCodes.ts"),
  tsLines.join("\n")
);

console.log("Generated ErrorCodes for Kotlin, Swift, and TypeScript.");
