import { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { _echoJsonValue } from "@tealium/prism-react-native";
import type {
  DataLayer,
  JsonValue,
  JsonValueObject,
} from "@tealium/prism-react-native";
import { useTealium } from "../TealiumProvider";

interface TestCase {
  name: string;
  /** Produces the actual value to compare against `expected`. */
  run: () => Promise<JsonValue | undefined>;
  expected?: JsonValue;
  /** Custom validator — returns failure message or undefined on success. */
  check?: (actual: JsonValue | undefined) => string | undefined;
}

interface TestResult {
  name: string;
  passed: boolean;
  mismatch?: string;
}

const ECHO_TEST_CASES: {
  name: string;
  input: JsonValue;
  /** Custom validator — returns failure message or undefined on success. */
  check?: (echoed: JsonValue) => string | undefined;
}[] = [
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
  // Primitive cases
  { name: "Bare string", input: "hello world" },
  { name: "Bare integer", input: 42 },
  { name: "Bare fractional", input: 3.14159 },
  { name: "Bare boolean true", input: true },
  { name: "Bare boolean false", input: false },
  { name: "Bare null", input: null },
  // Array cases
  { name: "Empty array", input: [] },
  { name: "Flat array", input: [1, "two", true, null] },
  {
    name: "Nested arrays",
    input: [
      [1, 2],
      [3, 4],
    ],
  },
  { name: "Array with objects", input: [{ a: 1 }, { b: [2, 3] }] },
  // Date strings — must pass through unmodified (native treats them as plain strings)
  {
    name: "ISO date with millis (.000Z)",
    input: { ts: "2024-01-15T09:30:00.000Z" },
  },
  {
    name: "ISO date without millis (Z)",
    input: { ts: "2024-01-15T09:30:00Z" },
  },
  // Non-finite numbers — converted to strings matching the native Prism SDK behavior
  {
    name: 'Infinity becomes "Infinity"',
    input: { val: 1 / 0 },
    check: (echoed) => {
      const val = (echoed as Record<string, unknown>).val;
      return val === "Infinity"
        ? undefined
        : `expected "Infinity", got ${String(val)}`;
    },
  },
  {
    name: '-Infinity becomes "-Infinity"',
    input: { val: -1 / 0 },
    check: (echoed) => {
      const val = (echoed as Record<string, unknown>).val;
      return val === "-Infinity"
        ? undefined
        : `expected "-Infinity", got ${String(val)}`;
    },
  },
  {
    name: 'NaN becomes "NaN"',
    input: { val: 0 / 0 },
    check: (echoed) => {
      const val = (echoed as Record<string, unknown>).val;
      return val === "NaN" ? undefined : `expected "NaN", got ${String(val)}`;
    },
  },
];

// JSON-safe values (no Infinity/NaN) used to drive the DataLayer round-trip
// cases below — each one is put through both the single-key `put` and bulk
// `putAll` methods and read back with `get`.
const DATALAYER_VALUE_CASES: { name: string; value: JsonValue }[] = [
  { name: "Primitives", value: { s: "hello", n: 42, b: true, nil: null } },
  { name: "Fractional number", value: { pi: 3.14159 } },
  { name: "Nested object", value: { outer: { inner: "deep" } } },
  { name: "Nested array with null", value: { items: [1, "two", null, true] } },
  { name: "Empty containers", value: { o: {}, a: [] } },
  {
    name: "Deep nesting with null leaf",
    value: { l1: { l2: { l3: { leaf: null } } } },
  },
  { name: "Unicode", value: { emoji: "🎯", cjk: "日本語" } },
  { name: "MAX_SAFE_INTEGER", value: Number.MAX_SAFE_INTEGER },
  { name: "MIN_SAFE_INTEGER", value: Number.MIN_SAFE_INTEGER },
  { name: "Bare string", value: "hello world" },
  { name: "Bare integer", value: 42 },
  { name: "Bare fractional", value: 3.14159 },
  { name: "Bare true", value: true },
  { name: "Bare false", value: false },
  { name: "Bare null", value: null },
  { name: "Flat array with null", value: [1, "two", true, null] },
  { name: "Array with objects", value: [{ a: 1 }, { b: [2, 3] }] },
];

const DATALAYER_SINGLE_KEY = "bridge_test_single";
const DATALAYER_BULK_KEY = "bridge_test_bulk";
const DATALAYER_MULTI_KEYS = [
  "bridge_test_a",
  "bridge_test_b",
  "bridge_test_c",
] as const;

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

function buildEchoTestCases(): TestCase[] {
  return ECHO_TEST_CASES.map((tc) => ({
    name: tc.name,
    run: () => _echoJsonValue(tc.input),
    expected: tc.input,
    check: tc.check as
      | ((actual: JsonValue | undefined) => string | undefined)
      | undefined,
  }));
}

// TODO: update the comment when Kotlin null drops are fixed
// Builds the on-device DataLayer round-trip cases against `dl`. Every value
// must round-trip exactly on both platforms, including a top-level JSON null
// inside a bulk put. The Kotlin SDK data layer currently drops top-level null
// values in bulk puts, so the bulk "Bare null" and "multiple keys with null"
// cases are expected to fail on Android until the SDK is aligned with Swift.
function buildDataLayerTestCases(dl: DataLayer): TestCase[] {
  const cases: TestCase[] = [];

  for (const { name, value } of DATALAYER_VALUE_CASES) {
    cases.push({
      name: `DataLayer single put: ${name}`,
      expected: value,
      run: async () => {
        try {
          await dl.remove(DATALAYER_SINGLE_KEY);
          await dl.put(DATALAYER_SINGLE_KEY, value);
          return await dl.get(DATALAYER_SINGLE_KEY);
        } finally {
          await dl.remove(DATALAYER_SINGLE_KEY);
        }
      },
    });
    cases.push({
      name: `DataLayer bulk put: ${name}`,
      expected: value,
      run: async () => {
        try {
          await dl.remove(DATALAYER_BULK_KEY);
          await dl.putAll({ [DATALAYER_BULK_KEY]: value });
          return await dl.get(DATALAYER_BULK_KEY);
        } finally {
          await dl.remove(DATALAYER_BULK_KEY);
        }
      },
    });
  }

  const multiValues: JsonValueObject = {
    bridge_test_a: "x",
    bridge_test_b: null,
    bridge_test_c: 1,
  };

  cases.push({
    name: "DataLayer bulk put: multiple keys with null",
    expected: multiValues,
    run: async () => {
      try {
        await dl.putAll(multiValues);
        const all = await dl.getAll();
        return DATALAYER_MULTI_KEYS.reduce<JsonValueObject>((acc, key) => {
          if (key in all) {
            acc[key] = all[key];
          }
          return acc;
        }, {});
      } finally {
        await dl.remove([...DATALAYER_MULTI_KEYS]);
      }
    },
  });

  return cases;
}

export default function BridgeTestScreen() {
  const { activeInstance } = useTealium();
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [running, setRunning] = useState(false);

  const testCases = useMemo<TestCase[]>(() => {
    const echoCases = buildEchoTestCases();
    return activeInstance
      ? [...echoCases, ...buildDataLayerTestCases(activeInstance.dataLayer)]
      : echoCases;
  }, [activeInstance]);

  const runTests = useCallback(async () => {
    setRunning(true);
    setResults(null);

    const out: TestResult[] = [];

    for (const tc of testCases) {
      try {
        const actual = await tc.run();
        if (tc.check) {
          const failure = tc.check(actual);
          out.push({
            name: tc.name,
            passed: failure === undefined,
            mismatch: failure,
          });
        } else {
          const expectedStr = sortedStringify(tc.expected);
          const actualStr = sortedStringify(actual);
          const passed = expectedStr === actualStr;
          out.push({
            name: tc.name,
            passed,
            mismatch: passed
              ? undefined
              : `expected ${expectedStr}\ngot      ${actualStr}`,
          });
        }
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
  }, [testCases]);

  const passedCount = results?.filter((r) => r.passed).length ?? 0;
  const totalCount = results?.length ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Bridge Round-Trip Tests</Text>

      {!activeInstance && (
        <Text style={styles.hint}>
          Create an instance on the Instances screen to include DataLayer tests.
        </Text>
      )}

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
  hint: {
    color: "#666",
    fontSize: 14,
    fontWeight: 500,
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
    fontSize: 12,
    color: "#555",
    marginTop: 2,
  },
});
