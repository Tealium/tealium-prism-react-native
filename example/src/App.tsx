import { useEffect, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { getSdkVersion } from "@tealium/prism-react-native";

export default function App() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    getSdkVersion()
      .then((v) => {
        setVersion(v);
      })
      .catch(() => {
        setVersion("Not available");
      });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tealium Prism</Text>
      <Text style={styles.status}>
        {version !== null ? `SDK version: ${version}` : "Loading…"}
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
