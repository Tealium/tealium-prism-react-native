import { Text, View, StyleSheet } from "react-native";
import { isWrapperLoaded } from "@tealium/prism-react-native";

// PR0 demo: confirm the native wrapper module is linked and resolvable on the
// running platform. No Prism functionality is exercised yet.
// TODO: remove this later, once PR1+ exposes actual functionality that can be tested against
const loaded = isWrapperLoaded();

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tealium Prism</Text>
      <Text style={styles.status}>
        {loaded ? "✓ Wrapper loaded" : "✗ Wrapper not loaded"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  status: {
    fontSize: 16,
  },
});
