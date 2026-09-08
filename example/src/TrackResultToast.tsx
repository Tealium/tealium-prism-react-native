import { useEffect, useRef, useState, useCallback } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  StyleSheet,
  Animated,
  Modal,
} from "react-native";
import { type TrackResult } from "@tealium/prism-react-native";

type Props = {
  /** The most recent track result to surface, or null to show nothing. */
  result: TrackResult | null;
  /** Called once the toast has faded out so the owner can clear its result. */
  onDismiss: () => void;
  /** Label used when logging the payload to the dev console. */
  logTag?: string;
};

/**
 * A tappable toast that surfaces a {@link TrackResult}. Tapping it opens a modal
 * with the full dispatch payload (also logged to the dev console); it auto-hides
 * after 5s or can be dismissed manually. Shared by screens that track events so
 * they present results identically.
 */
export default function TrackResultToast({
  result,
  onDismiss,
  logTag = "TrackResultToast",
}: Props) {
  const [showPayloadModal, setShowPayloadModal] = useState(false);

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setShowPayloadModal(false);
    Animated.timing(toastOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(({ finished }) => {
      // Only the fade that actually ran to completion clears the result; an
      // interrupted animation (e.g. a second hideToast) must not fire a
      // duplicate onDismiss.
      if (finished) {
        onDismiss();
      }
    });
  }, [toastOpacity, onDismiss]);

  useEffect(() => {
    if (result) {
      toastOpacity.setValue(0);
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }

      toastTimer.current = setTimeout(() => {
        hideToast();
      }, 5000);
    } else {
      // Result cleared externally (e.g. active instance changed): make sure a
      // previously-open payload modal doesn't linger and reopen on the next
      // result.
      setShowPayloadModal(false);
    }

    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, [result, hideToast, toastOpacity]);

  useEffect(() => {
    if (showPayloadModal) {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
        toastTimer.current = null;
      }
      if (result) {
        console.log(
          `[${logTag}] Dispatch Payload:`,
          JSON.stringify(result.payload, null, 2),
        );
      }
    }
  }, [showPayloadModal, result, logTag]);

  if (!result) {
    return null;
  }

  return (
    <>
      <Animated.View
        style={[
          styles.toast,
          {
            opacity: toastOpacity,
            transform: [
              {
                translateY: toastOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.toastTouchable}
          onPress={() => setShowPayloadModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.toastContent}>
            <View style={styles.toastTextContainer}>
              <Text style={styles.toastTitle}>Track Result</Text>
              <Text style={styles.toastText}>Status: {result.status}</Text>
              <Text style={styles.toastText}>Info: {result.info}</Text>
              <Text style={styles.toastHint}>Tap to view payload</Text>
            </View>
            <TouchableOpacity
              style={styles.toastDismiss}
              onPress={(e) => {
                e.stopPropagation();
                hideToast();
              }}
            >
              <Text style={styles.toastDismissText}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={showPayloadModal}
        transparent
        animationType="fade"
        onRequestClose={hideToast}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dispatch Payload</Text>
              <TouchableOpacity onPress={hideToast}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalNotice}>
              <Text style={styles.modalNoticeText}>
                💡 Payload logged to dev console
              </Text>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.payloadText}>
                {JSON.stringify(result.payload, null, 2)}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#28a745",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastTouchable: {
    flex: 1,
  },
  toastContent: {
    flexDirection: "row",
    padding: 16,
    alignItems: "flex-start",
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    marginBottom: 6,
  },
  toastText: {
    color: "#e5e5e5",
    fontSize: 13,
    marginBottom: 2,
  },
  toastHint: {
    color: "#b8e0c3",
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  toastDismiss: {
    marginLeft: 12,
    padding: 4,
  },
  toastDismissText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "100%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalClose: {
    fontSize: 24,
    color: "#666",
  },
  modalNotice: {
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalNoticeText: {
    fontSize: 13,
    color: "#1976d2",
  },
  modalBody: {
    padding: 16,
  },
  payloadText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#333",
  },
});
