import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { type ReactNode } from "react";

export default function ScreenWithBack({
  onBack,
  children,
}: {
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.flex}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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
