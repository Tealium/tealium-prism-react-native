#!/usr/bin/env node
// Generates typed ErrorCode constants for Kotlin, Swift, and TypeScript from
// packages/core/error-codes.json. Run via: node scripts/generate-error-codes.js

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const codes = JSON.parse(
  fs.readFileSync(path.join(root, "packages/core/error-codes.json"), "utf8")
);

function entriesFor(platform) {
  return codes.filter((e) => !e.platforms || e.platforms.includes(platform));
}

function codesFor(platform) {
  return entriesFor(platform).map((e) => e.code);
}

const header = "// Generated from error-codes.json — do not edit manually";

function toSwiftCamelCase(screaming) {
  const parts = screaming.toLowerCase().split("_");
  return parts[0] + parts.slice(1).map((p) => p[0].toUpperCase() + p.slice(1)).join("");
}

// Kotlin
const ktCodes = codesFor("kotlin");
const ktLines = [
  header,
  "package com.tealium.prism.reactnative",
  "",
  "internal object ErrorCode {",
  ...ktCodes.map((c) => `    const val ${c} = "${c}"`),
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
const swiftCodes = codesFor("swift");
const swiftLines = [
  header,
  "enum ErrorCode: String {",
  ...swiftCodes.map((c) => `    case ${toSwiftCamelCase(c)} = "${c}"`),
  "}",
  "",
];
fs.writeFileSync(
  path.join(root, "packages/core/ios/Sources/ErrorCode.swift"),
  swiftLines.join("\n")
);

// TypeScript. Only this output carries the "description" field, as TSDoc.
const tsEntries = entriesFor("ts").flatMap((e) => {
  if (!e.description) {
    throw new Error(`error-codes.json: "${e.code}" needs a description.`);
  }
  return [`  /** ${e.description} */`, `  ${e.code}: "${e.code}",`];
});
const tsLines = [
  header,
  "/**",
  " * Machine-readable codes for errors raised by the wrapper or the native SDK.",
  " *",
  " * Compare {@link TealiumError.code} against these values.",
  " */",
  "export const ErrorCode = {",
  ...tsEntries,
  "} as const;",
  "",
];
fs.writeFileSync(
  path.join(root, "packages/core/src/ErrorCode.ts"),
  tsLines.join("\n")
);

console.log("Generated ErrorCode for Kotlin, Swift, and TypeScript.");
