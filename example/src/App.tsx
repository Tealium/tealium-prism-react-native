import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { getSdkVersion } from "@tealium/prism-react-native";
import BridgeTestScreen from "./BridgeTestScreen";
import InstancesScreen from "./InstancesScreen";

type Screen = "home" | "bridgeTests" | "instances";

export default function App() {
  const [version, setVersion] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("home");

  useEffect(() => {
    getSdkVersion()
      .then((v) => {
        setVersion(v);
      })
      .catch(() => {
        setVersion("Not available");
      });
  }, []);

  if (screen === "bridgeTests") {
    return (
      <View style={styles.flex}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreen("home")}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <BridgeTestScreen />
      </View>
    );
  }

  if (screen === "instances") {
    return (
      <View style={styles.flex}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreen("home")}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <InstancesScreen />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tealium Prism</Text>
      <Text style={styles.status}>
        {version !== null ? `SDK version: ${version}` : "Loading…"}
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setScreen("instances")}
      >
        <Text style={styles.buttonText}>Instances</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setScreen("bridgeTests")}
      >
        <Text style={styles.buttonText}>Bridge Tests</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  status: {
    fontSize: 16,
  },
  button: {
    marginTop: 8,
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 8,
  },
  backText: {
    fontSize: 16,
    color: "#007AFF",
  },
});
