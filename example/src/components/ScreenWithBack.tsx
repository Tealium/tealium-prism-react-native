import {
  KeyboardAvoidingView,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { type ReactNode } from "react";

export default function ScreenWithBack({
  onBack,
  children,
}: {
  onBack: () => void;
  children: ReactNode;
}) {
  // "padding" on both platforms: iOS never resizes for the keyboard, and on
  // Android the app is edge-to-edge (targetSdk 36), so `adjustResize` can't be
  // relied on to shrink the window either.
  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      {children}
    </KeyboardAvoidingView>
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
