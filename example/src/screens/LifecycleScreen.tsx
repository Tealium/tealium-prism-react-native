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

// Lifecycle demo: tracks a "lifecycle_data_test" event on the active app
// instance selected on the Instances screen. A load rule in mobile_settings.json
// attaches the Lifecycle module's data to events with this name, so the tappable
// result toast reveals the lifecycle fields in the dispatch payload.
export default function LifecycleScreen() {
  const { activeInstance } = useTealium();
  const [lastResult, setLastResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const guard = useActiveInstanceGuard(activeInstance);

  // Drop any stale result when the active instance changes or goes away.
  useEffect(() => {
    setLastResult(null);
    setError(null);
  }, [activeInstance?.instanceId]);

  const handleSend = () => {
    setError(null);
    if (!activeInstance) {
      setError("No active instance. Create one on the Instances screen.");
      return;
    }
    activeInstance
      .track("lifecycle_data_test", "event")
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
            <Text style={styles.sectionTitle}>Lifecycle</Text>
            <Text style={styles.hint}>
              Tracks a "lifecycle_data_test" event. Tap the result toast to view
              the lifecycle data in the dispatch payload.
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleSend}>
              <Text style={styles.buttonText}>Send Lifecycle Data</Text>
            </TouchableOpacity>
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
        logTag="LifecycleScreen"
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
