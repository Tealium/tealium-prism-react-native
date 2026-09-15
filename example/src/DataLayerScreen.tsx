import { useEffect, useRef, useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  StyleSheet,
} from "react-native";
import {
  type Disposable,
  type JsonValueObject,
} from "@tealium/prism-react-native";
import { useTealium } from "./TealiumProvider";

// DataLayer demo: subscribe to the active instance's `onDataUpdated` stream and
// show each delta as it arrives. Track an event to induce data-layer changes.
// The subscription is disposed on unmount and whenever the active instance
// changes, exercising the wrapper's subscription lifecycle end-to-end.
export default function DataLayerScreen() {
  const { activeInstance } = useTealium();
  const [subscribed, setSubscribed] = useState(false);
  const [updates, setUpdates] = useState<JsonValueObject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const subscription = useRef<Disposable | null>(null);

  // Dispose and reset when the active instance changes or the screen unmounts,
  // so a subscription never outlives the instance it belongs to.
  useEffect(() => {
    setSubscribed(false);
    setUpdates([]);
    setError(null);
    return () => {
      subscription.current?.dispose();
      subscription.current = null;
    };
  }, [activeInstance?.instanceId]);

  const handleSubscribe = () => {
    setError(null);
    if (!activeInstance || subscription.current) {
      return;
    }
    try {
      subscription.current = activeInstance.dataLayer.onDataUpdated((data) => {
        setUpdates((prev) => [data, ...prev]);
      });
      setSubscribed(true);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleUnsubscribe = () => {
    subscription.current?.dispose();
    subscription.current = null;
    setSubscribed(false);
  };

  const handleTrack = () => {
    setError(null);
    activeInstance
      ?.track("data_layer_demo_event", "event")
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
          <Text style={styles.sectionTitle}>onDataUpdated</Text>
          <Text style={styles.stateText}>
            {subscribed ? "🟢 Subscribed" : "⚪ Not subscribed"}
          </Text>
          {subscribed ? (
            <TouchableOpacity style={styles.button} onPress={handleUnsubscribe}>
              <Text style={styles.buttonText}>Unsubscribe</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleSubscribe}>
              <Text style={styles.buttonText}>Subscribe</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionTitle}>Induce an update</Text>
          <Text style={styles.hint}>
            Track an event to change the data layer. Any resulting delta appears
            below while subscribed.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleTrack}>
            <Text style={styles.buttonText}>Track Event</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>
            Updates received ({updates.length})
          </Text>
          {updates.length === 0 ? (
            <Text style={styles.hint}>No updates yet.</Text>
          ) : (
            updates.map((delta, index) => (
              <View key={updates.length - index} style={styles.resultBox}>
                <Text style={styles.payloadText}>
                  {JSON.stringify(delta, null, 2)}
                </Text>
              </View>
            ))
          )}
        </>
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
  resultBox: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
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
