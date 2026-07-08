#!/usr/bin/env node
// Generates typed ErrorCode constants for Kotlin, Swift, and TypeScript from
// packages/core/error-codes.json. Run via: node scripts/generate-error-codes.js

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const codes = JSON.parse(
  fs.readFileSync(path.join(root, "packages/core/error-codes.json"), "utf8")
);

const header = "// Generated from error-codes.json — do not edit manually";

function toSwiftCamelCase(screaming) {
  const parts = screaming.toLowerCase().split("_");
  return parts[0] + parts.slice(1).map((p) => p[0].toUpperCase() + p.slice(1)).join("");
}

// Kotlin
const ktLines = [
  header,
  "package com.tealium.prism.reactnative",
  "",
  "internal object ErrorCode {",
  ...codes.map((c) => `    const val ${c} = "${c}"`),
  "}",
  "",
];
fs.writeFileSync(
  path.join(
    root,
    "packages/core/android/src/main/java/com/tealium/prism/reactnative/ErrorCode.kt"
  ),
  ktLines.join("\n")
);

// Swift
const swiftLines = [
  header,
  "enum ErrorCode: String {",
  ...codes.map((c) => `    case ${toSwiftCamelCase(c)} = "${c}"`),
  "}",
  "",
];
fs.writeFileSync(
  path.join(root, "packages/core/ios/ErrorCode.swift"),
  swiftLines.join("\n")
);

// TypeScript
const tsLines = [
  header,
  "export const ErrorCode = {",
  ...codes.map((c) => `  ${c}: "${c}",`),
  "} as const;",
  "",
];
fs.writeFileSync(
  path.join(root, "packages/core/src/ErrorCode.ts"),
  tsLines.join("\n")
);

console.log("Generated ErrorCode for Kotlin, Swift, and TypeScript.");
