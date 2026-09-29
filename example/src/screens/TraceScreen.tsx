import { useEffect, useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  StyleSheet,
} from "react-native";
import { type TrackResult } from "@tealium/prism-react-native";
import { useTealium } from "../TealiumProvider";
import JsonPayload from "../components/JsonPayload";
import PlainTextInput from "../components/PlainTextInput";

// Trace demo: join/leave a trace and force end-of-visit on the active app
// instance selected on the Instances screen. Track an event in between to
// observe the trace id being added to (and removed from) the dispatch payload.
export default function TraceScreen() {
  const { activeInstance } = useTealium();
  const [traceId, setTraceId] = useState("");
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset trace UI when the active instance changes or goes away, so stale
  // "in a trace" state from a previous instance is not shown.
  useEffect(() => {
    setJoined(false);
    setStatus(null);
    setLastResult(null);
    setError(null);
  }, [activeInstance?.instanceId]);

  const handleJoin = () => {
    setError(null);
    const id = traceId.trim();
    if (!id) {
      setError("Enter a trace id");
      return;
    }
    activeInstance?.trace
      .join(id)
      .then(() => {
        setJoined(true);
        setStatus(`Joined trace ${id}`);
      })
      .catch((e) => setError(String(e)));
  };

  const handleLeave = () => {
    setError(null);
    activeInstance?.trace
      .leave()
      .then(() => {
        setJoined(false);
        setStatus("Left trace");
      })
      .catch((e) => setError(String(e)));
  };

  const handleForceEndOfVisit = () => {
    setError(null);
    activeInstance?.trace
      .forceEndOfVisit()
      .then((result) => {
        setLastResult(result);
        setStatus(`Force end of visit: ${result.status}`);
      })
      .catch((e) => setError(String(e)));
  };

  const handleTrack = () => {
    setError(null);
    activeInstance
      ?.track("trace_demo_event", "event")
      .then((result) => setLastResult(result))
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
          <Text style={styles.sectionTitle}>Trace</Text>
          <Text style={styles.stateText}>
            {joined ? "🟢 In an active trace" : "⚪ Not in a trace"}
          </Text>
          <PlainTextInput
            style={styles.input}
            placeholder="Trace ID"
            value={traceId}
            onChangeText={setTraceId}
          />
          <TouchableOpacity style={styles.button} onPress={handleJoin}>
            <Text style={styles.buttonText}>Join Trace</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleLeave}>
            <Text style={styles.buttonText}>Leave Trace</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={handleForceEndOfVisit}
          >
            <Text style={styles.buttonText}>Force End of Visit</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Observe</Text>
          <Text style={styles.hint}>
            Track an event to see the trace id in the dispatch payload below.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleTrack}>
            <Text style={styles.buttonText}>Track Event</Text>
          </TouchableOpacity>
        </>
      )}

      {status && (
        <View style={styles.statusBox}>
          <Text style={styles.statusBoxText}>{status}</Text>
        </View>
      )}

      {lastResult && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>
            Last dispatch: {lastResult.status}
          </Text>
          <JsonPayload value={lastResult.payload} boxed={false} />
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
  stateText: {
    fontSize: 15,
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
