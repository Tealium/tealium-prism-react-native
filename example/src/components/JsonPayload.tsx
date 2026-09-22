import {
  Text,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Props = {
  /** The value to pretty-print as JSON. */
  value: unknown;
  /** Whether to wrap the text in the shared box styling. Defaults to true. */
  boxed?: boolean;
  /** Extra style applied to the box (ignored when `boxed` is false). */
  style?: StyleProp<ViewStyle>;
};

/**
 * Renders a value as pretty-printed, monospaced JSON. Shared by screens that
 * display track results, data-layer deltas, and dispatch payloads so they
 * present JSON identically.
 */
export default function JsonPayload({ value, boxed = true, style }: Props) {
  const text = (
    <Text style={styles.payloadText}>{JSON.stringify(value, null, 2)}</Text>
  );

  if (!boxed) {
    return text;
  }

  return <View style={[styles.box, style]}>{text}</View>;
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 6,
  },
  payloadText: {
    fontFamily: "monospace",
    fontSize: 13,
    color: "#333",
  },
});
