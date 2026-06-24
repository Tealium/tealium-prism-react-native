import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { echoDataObject } from "@tealium/prism-react-native";
import type { JsonValueObject } from "@tealium/prism-react-native";

interface TestCase {
  name: string;
  input: JsonValueObject;
}

interface TestResult {
  name: string;
  passed: boolean;
  mismatch?: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: "Primitives",
    input: { s: "hello", n: 42, b: true, nil: null },
  },
  {
    name: "Fractional number",
    input: { pi: 3.14159 },
  },
  {
    name: "Nested object",
    input: { outer: { inner: "deep" } },
  },
  {
    name: "Nested array",
    input: { items: [1, "two", null, true] },
  },
  {
    name: "Empty containers",
    input: { obj: {}, arr: [] },
  },
  {
    name: "Deep nesting",
    input: {
      l1: {
        l2: {
          l3: {
            l4: { leaf: "value" },
            r4: { leaf: 42.55 },
            d4: { leaf: true },
            s4: { leaf: [1, 2, 3] },
            a4: { leaf: null },
          },
        },
      },
    },
  },
  {
    name: "Unicode",
    input: { emoji: "🎯", cjk: "日本語" },
  },
  {
    name: "MAX_SAFE_INTEGER",
    input: { big: Number.MAX_SAFE_INTEGER },
  },
  {
    name: "MIN_SAFE_INTEGER",
    input: { small: Number.MIN_SAFE_INTEGER },
  },
  {
    name: "Null at root",
    input: { only: null },
  },
  {
    name: "Mixed array with objects",
    input: { mix: [{ a: 1 }, [2, 3], "x"] },
  },
  {
    name: "String Infinity",
    input: { val: "Infinity" },
  },
  {
    name: "String -Infinity",
    input: { val: "-Infinity" },
  },
  {
    name: "String NaN",
    input: { val: "NaN" },
  },
];

function sortedStringify(value: unknown): string {
  return JSON.stringify(value, (_, v) => {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      return Object.keys(v as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = (v as Record<string, unknown>)[k];
          return acc;
        }, {});
    }
    return v;
  });
}

export default function BridgeTestScreen() {
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [running, setRunning] = useState(false);

  async function runTests() {
    setRunning(true);
    setResults(null);

    const out: TestResult[] = [];

    for (const tc of TEST_CASES) {
      try {
        const echoed = await echoDataObject(tc.input);
        const inputStr = sortedStringify(tc.input);
        const outputStr = sortedStringify(echoed);
        const passed = inputStr === outputStr;
        out.push({
          name: tc.name,
          passed,
          mismatch: passed
            ? undefined
            : `expected ${inputStr}\ngot      ${outputStr}`,
        });
      } catch (e) {
        out.push({
          name: tc.name,
          passed: false,
          mismatch: String(e),
        });
      }
    }

    const summary = {
      type: "BRIDGE_TEST_RESULT",
      passed: out.filter((r) => r.passed).length,
      total: out.length,
      results: out,
    };
    console.log(JSON.stringify(summary));

    setResults(out);
    setRunning(false);
  }

  const passedCount = results?.filter((r) => r.passed).length ?? 0;
  const totalCount = results?.length ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Bridge Round-Trip Tests</Text>

      <TouchableOpacity
        style={[styles.button, running && styles.buttonDisabled]}
        onPress={runTests}
        disabled={running}
      >
        <Text style={styles.buttonText}>
          {running ? "Running…" : "Run Bridge Tests"}
        </Text>
      </TouchableOpacity>

      {results !== null && (
        <View style={styles.summary}>
          <Text
            style={[
              styles.summaryText,
              passedCount === totalCount ? styles.pass : styles.fail,
            ]}
          >
            {passedCount}/{totalCount} passed
          </Text>
        </View>
      )}

      {results?.map((r) => (
        <View key={r.name} style={styles.row}>
          <Text style={r.passed ? styles.pass : styles.fail}>
            {r.passed ? "✓" : "✗"} {r.name}
          </Text>
          {r.mismatch !== undefined && (
            <Text style={styles.mismatch}>{r.mismatch}</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 60,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#aaa",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  summary: {
    marginTop: 8,
  },
  summaryText: {
    fontSize: 18,
    fontWeight: "700",
  },
  row: {
    paddingVertical: 4,
  },
  pass: {
    color: "#228B22",
    fontSize: 15,
  },
  fail: {
    color: "#CC0000",
    fontSize: 15,
  },
  mismatch: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "#555",
    marginTop: 2,
  },
});
