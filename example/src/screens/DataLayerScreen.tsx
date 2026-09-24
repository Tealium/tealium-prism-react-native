import { useEffect, useState, useCallback } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  StyleSheet,
} from "react-native";
import { type ExpiryPolicy } from "@tealium/prism-react-native";
import { useTealium } from "../TealiumProvider";
import { useActiveInstanceGuard } from "../hooks/useActiveInstanceGuard";
import Toast, { type ToastNotice } from "../components/Toast";

type ExpiryPreset = "forever" | "session" | "untilRestart" | "afterSeconds";

const EXPIRY_PRESETS: { preset: ExpiryPreset; label: string }[] = [
  { preset: "forever", label: "Forever" },
  { preset: "session", label: "Session" },
  { preset: "untilRestart", label: "Until Restart" },
  { preset: "afterSeconds", label: "After Seconds" },
];

// A fixed nested sample used by the "Put sample object" bulk button, to show
// put(data, expiry?) storing several keys (including nested/array/null
// values) in one call.
const SAMPLE_OBJECT = {
  // TODO: update comment when Kotlin null drops are fixed
  // Flat keys are visible in Tealium Trace; nested objects may be dropped
  // server-side, and the Kotlin SDK data layer ignores null values in bulk
  // puts (the Swift SDK stores them).
  sample_string: "hello from data layer",
  sample_number: 42,
  sample_tags: ["a", "b"],
  user: { id: 42, tags: ["a", "b"] },
  flag: true,
  nothing: null,
};

// DataLayer CRUD demo: put/get/getAll/remove/clear against the active app
// instance selected on the Instances screen. Mirrors TraceScreen's layout and
// TransformationsScreen's use of useActiveInstanceGuard so a result that
// resolves after switching instances is dropped instead of shown stale.
export default function DataLayerScreen() {
  const { activeInstance } = useTealium();
  const guard = useActiveInstanceGuard(activeInstance);

  const [key, setKey] = useState("demo_key");
  const [getKey, setGetKey] = useState("demo_key");
  const [removeKey, setRemoveKey] = useState("demo_key");
  const [valueJson, setValueJson] = useState('"hello"');
  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>("forever");
  const [afterSeconds, setAfterSeconds] = useState("60");

  const [notice, setNotice] = useState<ToastNotice | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);

  // Reset all demo state when the active instance changes or goes away, so
  // stale results from a previous instance are not shown.
  useEffect(() => {
    setNotice(null);
    setGetKey("demo_key");
    setRemoveKey("demo_key");
  }, [activeInstance?.instanceId]);

  const buildExpiry = (): ExpiryPolicy => {
    if (expiryPreset === "afterSeconds") {
      return { afterSeconds: Number(afterSeconds) };
    }
    return expiryPreset;
  };

  const handlePut = () => {
    setNotice(null);
    if (!activeInstance) {
      setNotice({
        kind: "error",
        title: "Error",
        lines: ["No active instance. Create one on the Instances screen."],
      });
      return;
    }
    let value;
    try {
      value = JSON.parse(valueJson);
    } catch (e) {
      setNotice({
        kind: "error",
        title: "Error",
        lines: [`Invalid JSON value: ${String(e)}`],
      });
      return;
    }
    activeInstance.dataLayer
      .put(key, value, buildExpiry())
      .then(
        guard(() => {
          setNotice({ kind: "success", title: `Put "${key}"` });
        }),
      )
      .catch(
        guard((e) =>
          setNotice({ kind: "error", title: "Error", lines: [String(e)] }),
        ),
      );
  };

  const handlePutSample = () => {
    setNotice(null);
    if (!activeInstance) {
      setNotice({
        kind: "error",
        title: "Error",
        lines: ["No active instance. Create one on the Instances screen."],
      });
      return;
    }
    activeInstance.dataLayer
      .put(SAMPLE_OBJECT, buildExpiry())
      .then(
        guard(() => {
          setNotice({ kind: "success", title: "Put sample object" });
        }),
      )
      .catch(
        guard((e) =>
          setNotice({ kind: "error", title: "Error", lines: [String(e)] }),
        ),
      );
  };

  const handleGet = () => {
    setNotice(null);
    if (!activeInstance) {
      setNotice({
        kind: "error",
        title: "Error",
        lines: ["No active instance. Create one on the Instances screen."],
      });
      return;
    }
    activeInstance.dataLayer
      .get(getKey)
      .then(
        guard((value) => {
          setNotice(
            value === undefined
              ? { kind: "info", title: `get "${getKey}"`, lines: ["absent"] }
              : {
                  kind: "info",
                  title: `get "${getKey}"`,
                  payload: value,
                  payloadTitle: "Value",
                },
          );
        }),
      )
      .catch(
        guard((e) =>
          setNotice({ kind: "error", title: "Error", lines: [String(e)] }),
        ),
      );
  };

  const handleGetAll = () => {
    setNotice(null);
    if (!activeInstance) {
      setNotice({
        kind: "error",
        title: "Error",
        lines: ["No active instance. Create one on the Instances screen."],
      });
      return;
    }
    activeInstance.dataLayer
      .getAll()
      .then(
        guard((value) => {
          setNotice({
            kind: "info",
            title: "getAll",
            payload: value,
            payloadTitle: "Data layer",
          });
        }),
      )
      .catch(
        guard((e) =>
          setNotice({ kind: "error", title: "Error", lines: [String(e)] }),
        ),
      );
  };

  const handleRemove = () => {
    setNotice(null);
    if (!activeInstance) {
      setNotice({
        kind: "error",
        title: "Error",
        lines: ["No active instance. Create one on the Instances screen."],
      });
      return;
    }
    activeInstance.dataLayer
      .remove(removeKey)
      .then(
        guard(() => {
          setNotice({ kind: "success", title: `Removed "${removeKey}"` });
        }),
      )
      .catch(
        guard((e) =>
          setNotice({ kind: "error", title: "Error", lines: [String(e)] }),
        ),
      );
  };

  const handleClear = () => {
    setNotice(null);
    if (!activeInstance) {
      setNotice({
        kind: "error",
        title: "Error",
        lines: ["No active instance. Create one on the Instances screen."],
      });
      return;
    }
    activeInstance.dataLayer
      .clear()
      .then(
        guard(() => {
          setNotice({ kind: "success", title: "Cleared data layer" });
        }),
      )
      .catch(
        guard((e) =>
          setNotice({ kind: "error", title: "Error", lines: [String(e)] }),
        ),
      );
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.sectionTitle}>Instance</Text>
        {activeInstance ? (
          <Text style={styles.instanceKey}>{activeInstance.instanceId}</Text>
        ) : (
          <Text style={styles.hint}>
            No active instance. Create one on the Instances screen.
          </Text>
        )}

        <Text style={styles.sectionTitle}>Expiry</Text>
        <View style={styles.presetRow}>
          {EXPIRY_PRESETS.map(({ preset, label }) => (
            <TouchableOpacity
              key={preset}
              style={[
                styles.presetButton,
                expiryPreset === preset && styles.presetButtonSelected,
              ]}
              onPress={() => setExpiryPreset(preset)}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  expiryPreset === preset && styles.presetButtonTextSelected,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {expiryPreset === "afterSeconds" && (
          <TextInput
            style={styles.input}
            placeholder="Seconds"
            value={afterSeconds}
            onChangeText={setAfterSeconds}
            keyboardType="numeric"
          />
        )}

        <Text style={styles.sectionTitle}>Put</Text>
        <TextInput
          style={styles.input}
          placeholder="Key"
          value={key}
          onChangeText={setKey}
          autoCapitalize="none"
        />
        <TextInput
          keyboardType="ascii-capable"
          autoCorrect={false}
          spellCheck={false}
          style={styles.input}
          placeholder="Value (JSON)"
          value={valueJson}
          onChangeText={setValueJson}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handlePut}
          disabled={!activeInstance}
        >
          <Text style={styles.buttonText}>Put Key/Value</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={handlePutSample}
          disabled={!activeInstance}
        >
          <Text style={styles.buttonText}>Put Sample Object</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Get</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.rowInput]}
            placeholder="key"
            value={getKey}
            onChangeText={setGetKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.rowButton}
            onPress={handleGet}
            disabled={!activeInstance}
          >
            <Text style={styles.buttonText}>Get</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={handleGetAll}
          disabled={!activeInstance}
        >
          <Text style={styles.buttonText}>Get All</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Remove</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.rowInput]}
            placeholder="key"
            value={removeKey}
            onChangeText={setRemoveKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.rowButton, styles.dangerButton]}
            onPress={handleRemove}
            disabled={!activeInstance}
          >
            <Text style={styles.buttonText}>Remove</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleClear}
          disabled={!activeInstance}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
      </ScrollView>

      <Toast
        notice={notice}
        onDismiss={dismissNotice}
        logTag="DataLayerScreen"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 12,
  },
  hint: {
    color: "#666",
    fontSize: 13,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    fontSize: 15,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  rowInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  rowButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 0,
  },
  dangerButton: {
    backgroundColor: "#c62828",
  },
  instanceKey: {
    fontSize: 14,
    fontFamily: "monospace",
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  presetButton: {
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  presetButtonSelected: {
    backgroundColor: "#007AFF",
  },
  presetButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  presetButtonTextSelected: {
    color: "#fff",
  },
});
