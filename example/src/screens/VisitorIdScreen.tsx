import { useEffect, useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useTealium } from "../TealiumProvider";

// Visitor ID demo: read the current visitor id, regenerate the anonymous
// visitor id, or erase the stored identity-linked id history on the active
// app instance selected on the Instances screen. All three resolve with a
// visitor id, shown below.
export default function VisitorIdScreen() {
  const { activeInstance } = useTealium();
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load the current visitor id whenever the screen opens (screens remount on
  // every visit) or the active instance changes. The UI is reset first and a
  // late response for a previous instance is ignored, so a stale id is not shown.
  useEffect(() => {
    setVisitorId(null);
    setStatus(null);
    setError(null);
    let ignore = false;
    activeInstance?.visitorId
      .current()
      .then((id) => {
        if (ignore) return;
        setVisitorId(id);
        setStatus("Current visitor ID");
      })
      .catch((e) => {
        if (!ignore) setError(String(e));
      });
    return () => {
      ignore = true;
    };
  }, [activeInstance]);

  const handleRegenerate = () => {
    setError(null);
    activeInstance?.visitorId
      .regenerate()
      .then((id) => {
        setVisitorId(id);
        setStatus("Regenerated visitor ID");
      })
      .catch((e) => setError(String(e)));
  };

  const handleEraseLocalHistory = () => {
    setError(null);
    activeInstance?.visitorId
      .eraseLocalHistory()
      .then((id) => {
        setVisitorId(id);
        setStatus("Erased local visitor ID history");
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
          <Text style={styles.hint}>
            Visitor switching is driven by the "visitor_identity_key" configured
            for the VisitorId module in mobile_settings.json (set to
            "user_email"). Put that key on the Data Layer screen, then come back
            here to see the switched ID.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleRegenerate}>
            <Text style={styles.buttonText}>Regenerate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={handleEraseLocalHistory}
          >
            <Text style={styles.buttonText}>Erase local history</Text>
          </TouchableOpacity>
        </>
      )}

      {visitorId && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Visitor ID</Text>
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
