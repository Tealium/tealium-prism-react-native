import { useEffect, useState, type ComponentType } from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { getSdkVersion } from "@tealium/prism-react-native";
import BridgeTestScreen from "./screens/BridgeTestScreen";
import InstancesScreen from "./screens/InstancesScreen";
import TraceScreen from "./screens/TraceScreen";
import LifecycleScreen from "./screens/LifecycleScreen";
import TransformationsScreen from "./screens/TransformationsScreen";
import DataLayerScreen from "./screens/DataLayerScreen";
import ScreenWithBack from "./components/ScreenWithBack";
import { TealiumProvider } from "./TealiumProvider";

type Screen =
  | "home"
  | "bridgeTests"
  | "instances"
  | "trace"
  | "lifecycle"
  | "transformations"
  | "dataLayer";

const SCREENS: Record<Exclude<Screen, "home">, ComponentType> = {
  bridgeTests: BridgeTestScreen,
  instances: InstancesScreen,
  trace: TraceScreen,
  lifecycle: LifecycleScreen,
  transformations: TransformationsScreen,
  dataLayer: DataLayerScreen,
};

export default function App() {
  return (
    <TealiumProvider>
      <AppContent />
    </TealiumProvider>
  );
}

function AppContent() {
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

  if (screen !== "home") {
    const ScreenComponent = SCREENS[screen];
    return (
      <ScreenWithBack onBack={() => setScreen("home")}>
        <ScreenComponent />
      </ScreenWithBack>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tealium Prism</Text>
      <Text style={styles.status}>
        {version !== null ? `SDK version: ${version}` : "Loading…"}
      </Text>
      <TouchableOpacity
        style={[styles.button, styles.instancesButton]}
        onPress={() => setScreen("instances")}
      >
        <Text style={styles.buttonText}>Instances</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setScreen("trace")}
      >
        <Text style={styles.buttonText}>Trace</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setScreen("lifecycle")}
      >
        <Text style={styles.buttonText}>Lifecycle</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setScreen("transformations")}
      >
        <Text style={styles.buttonText}>Transformations</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setScreen("dataLayer")}
      >
        <Text style={styles.buttonText}>Data Layer</Text>
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
  instancesButton: {
    backgroundColor: "#28a745",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
