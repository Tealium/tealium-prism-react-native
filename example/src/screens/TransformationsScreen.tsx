import { useCallback, useEffect, useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  StyleSheet,
} from "react-native";
import { type TrackResult } from "@tealium/prism-react-native";
import { useTealium } from "../TealiumProvider";
import { useActiveInstanceGuard } from "../hooks/useActiveInstanceGuard";
import TrackResultToast from "../components/TrackResultToast";

// Each entry maps a button to the event name that matches a transformation's
// condition in mobile_settings.json. Tracking that event runs the corresponding
// transformation on the active instance, and the tappable result toast reveals
// the transformed fields in the dispatch payload.
const TRANSFORMATIONS: { label: string; event: string; hint: string }[] = [
  {
    label: "Lowercase",
    event: "lowercase_modules",
    hint: "Lowercases the enabled_modules values.",
  },
  {
    label: "Set Data Values",
    event: "set_copied_event",
    hint: "Copies tealium_event into the flat copied_event key.",
  },
  {
    label: "Persist Data Value",
    event: "persist_value",
    hint: "Persists a fixed value at the flat persisted_value key.",
  },
  {
    label: "JavaScript Transformer",
    event: "js_demo_event",
    hint: "Runs JS that derives js_result from enabled_modules.",
  },
];

// Transformations demo: each button tracks an event whose name matches a
// transformation's condition in mobile_settings.json, so the transformation
// fires and the tappable result toast reveals the transformed data in the
// dispatch payload. Works against the active instance selected on the Instances
// screen.
export default function TransformationsScreen() {
  const { activeInstance } = useTealium();
  const [lastResult, setLastResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const guard = useActiveInstanceGuard(activeInstance);

  // Drop any stale result when the active instance changes or goes away.
  useEffect(() => {
    setLastResult(null);
    setError(null);
  }, [activeInstance?.instanceId]);

  const handleSend = (event: string) => {
    setError(null);
    if (!activeInstance) {
      setError("No active instance. Create one on the Instances screen.");
      return;
    }
    activeInstance
      .track(event, "event")
      .then(guard((result) => setLastResult(result)))
      .catch(guard((e) => setError(String(e))));
  };

  const handleToastDismiss = useCallback(() => setLastResult(null), []);

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

        {activeInstance && (
          <>
            <Text style={styles.sectionTitle}>Transformations</Text>
            <Text style={styles.hint}>
              Each button tracks an event that triggers a transformation. Tap
              the result toast to view the transformed data in the dispatch
              payload.
            </Text>
            {TRANSFORMATIONS.map((transformation) => (
              <View key={transformation.event}>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => handleSend(transformation.event)}
                >
                  <Text style={styles.buttonText}>{transformation.label}</Text>
                </TouchableOpacity>
                <Text style={styles.hint}>{transformation.hint}</Text>
              </View>
            ))}
          </>
        )}

        {error && (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <TrackResultToast
        result={lastResult}
        onDismiss={handleToastDismiss}
        logTag="TransformationsScreen"
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
  instanceKey: {
    fontSize: 14,
    fontFamily: "monospace",
    marginBottom: 8,
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
  error: {
    backgroundColor: "#ffebee",
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  errorText: {
    color: "#c62828",
    fontSize: 14,
  },
});
