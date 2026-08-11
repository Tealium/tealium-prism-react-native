import { useEffect, useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useTealium } from "./TealiumProvider";

// Visitor ID demo: reset the anonymous visitor id or clear all stored ids on the
// active app instance selected on the Instances screen. Both resolve with the new
// id, shown below.
export default function VisitorIdScreen() {
  const { activeInstance } = useTealium();
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset UI when the active instance changes or goes away, so a stale id from a
  // previous instance is not shown.
  useEffect(() => {
    setVisitorId(null);
    setStatus(null);
    setError(null);
  }, [activeInstance?.instanceId]);

  const handleReset = () => {
    setError(null);
    activeInstance?.visitorId
      .reset()
      .then((id) => {
        setVisitorId(id);
        setStatus("Reset visitor id");
      })
      .catch((e) => setError(String(e)));
  };

  const handleClearStored = () => {
    setError(null);
    activeInstance?.visitorId
      .clearStored()
      .then((id) => {
        setVisitorId(id);
        setStatus("Cleared stored visitor ids");
      })
      .catch((e) => setError(String(e)));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
          <Text style={styles.sectionTitle}>Visitor ID</Text>
          <TouchableOpacity style={styles.button} onPress={handleReset}>
            <Text style={styles.buttonText}>Reset Visitor ID</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleClearStored}>
            <Text style={styles.buttonText}>Clear Stored Visitor IDs</Text>
          </TouchableOpacity>
        </>
      )}

      {visitorId && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>New visitor id</Text>
          <Text style={styles.payloadText}>{visitorId}</Text>
        </View>
      )}

      {status && (
        <View style={styles.statusBox}>
          <Text style={styles.statusBoxText}>{status}</Text>
        </View>
      )}

      {error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  instanceKey: {
    fontSize: 14,
    fontFamily: "monospace",
    marginBottom: 8,
  },
  statusBox: {
    backgroundColor: "#e8f5e9",
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  statusBoxText: {
    color: "#2e7d32",
    fontSize: 14,
  },
  resultBox: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  payloadText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#333",
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
