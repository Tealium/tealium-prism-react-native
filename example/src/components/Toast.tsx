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
import JsonPayload from "./JsonPayload";

export type ToastNotice = {
  kind: "success" | "error" | "info";
  title: string;
  lines?: string[];
  payload?: unknown;
  payloadTitle?: string;
};

type Props = {
  /** The notice to surface, or null to show nothing. */
  notice: ToastNotice | null;
  /** Called once the toast has faded out so the owner can clear its notice. */
  onDismiss: () => void;
  /** Label used when logging the payload to the dev console. */
  logTag?: string;
};

/**
 * A tappable toast that surfaces a {@link ToastNotice}. When the notice carries
 * a payload, tapping the toast opens a modal with the full payload (also
 * logged to the dev console); it auto-hides after 5s or can be dismissed
 * manually. Shared by screens that surface a status/result/error so they
 * present it identically.
 */
export default function Toast({ notice, onDismiss, logTag = "Toast" }: Props) {
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
      // Only the fade that actually ran to completion clears the notice; an
      // interrupted animation (e.g. a second hideToast) must not fire a
      // duplicate onDismiss.
      if (finished) {
        onDismiss();
      }
    });
  }, [toastOpacity, onDismiss]);

  useEffect(() => {
    if (notice) {
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
      // Notice cleared externally (e.g. active instance changed): make sure a
      // previously-open payload modal doesn't linger and reopen on the next
      // notice.
      setShowPayloadModal(false);
    }

    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, [notice, hideToast, toastOpacity]);

  useEffect(() => {
    if (showPayloadModal) {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
        toastTimer.current = null;
      }
      if (notice) {
        console.log(
          `[${logTag}] ${notice.payloadTitle ?? "Payload"}:`,
          JSON.stringify(notice.payload, null, 2),
        );
      }
    }
  }, [showPayloadModal, notice, logTag]);

  if (!notice) {
    return null;
  }

  const hasPayload = notice.payload !== undefined;

  const body = (
    <View style={styles.toastContent}>
      <View style={styles.toastTextContainer}>
        <Text style={styles.toastTitle}>{notice.title}</Text>
        {notice.lines?.map((line, index) => (
          <Text key={index} style={styles.toastText}>
            {line}
          </Text>
        ))}
        {hasPayload && (
          <Text style={styles.toastHint}>Tap to view payload</Text>
        )}
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
  );

  return (
    <>
      <Animated.View
        style={[
          styles.toast,
          TOAST_BACKGROUND_BY_KIND[notice.kind],
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
        {hasPayload ? (
          <TouchableOpacity
            style={styles.toastTouchable}
            onPress={() => setShowPayloadModal(true)}
            activeOpacity={0.8}
          >
            {body}
          </TouchableOpacity>
        ) : (
          body
        )}
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
              <Text style={styles.modalTitle}>
                {notice.payloadTitle ?? "Payload"}
              </Text>
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
              <JsonPayload value={notice.payload} boxed={false} />
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
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastSuccess: {
    backgroundColor: "#28a745",
  },
  toastError: {
    backgroundColor: "#c62828",
  },
  toastInfo: {
    backgroundColor: "#007AFF",
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
    fontWeight: 600,
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
});

const TOAST_BACKGROUND_BY_KIND: Record<ToastNotice["kind"], object> = {
  success: styles.toastSuccess,
  error: styles.toastError,
  info: styles.toastInfo,
};
