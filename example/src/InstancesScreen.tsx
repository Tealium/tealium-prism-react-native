import { useState, useEffect, useRef, useCallback } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  StyleSheet,
  Animated,
  Modal,
} from "react-native";
import { type LogLevel, type TrackResult } from "@tealium/prism-react-native";
import { useTealium } from "./TealiumProvider";

const LOG_LEVELS: LogLevel[] = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "silent",
];

export default function InstancesScreen() {
  const {
    instances,
    activeKey,
    activeInstance,
    createInstance,
    shutdownInstance,
    setActiveKey,
  } = useTealium();

  const [account, setAccount] = useState("tealiummobile");
  const [profile, setProfile] = useState("demo");
  const [environment, setEnvironment] = useState("dev");
  const [logLevel, setLogLevel] = useState<LogLevel | null>(null);
  const [logLevelDropdownOpen, setLogLevelDropdownOpen] = useState(false);

  const [trackName, setTrackName] = useState("test_event");
  const [trackType, setTrackType] = useState<"event" | "view">("event");
  const [trackData, setTrackData] = useState("");
  const [lastResult, setLastResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPayloadModal, setShowPayloadModal] = useState(false);

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.timing(toastOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setLastResult(null);
    });
  }, [toastOpacity]);

  useEffect(() => {
    if (lastResult) {
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
    }

    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, [lastResult, hideToast, toastOpacity]);

  useEffect(() => {
    if (showPayloadModal) {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
        toastTimer.current = null;
      }
      if (lastResult) {
        console.log(
          "[InstancesScreen] Dispatch Payload:",
          JSON.stringify(lastResult.payload, null, 2),
        );
      }
    }
  }, [showPayloadModal, lastResult]);

  const handleCreate = () => {
    setError(null);
    try {
      createInstance(account, profile, environment, logLevel ?? undefined);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleShutdown = (key: string) => {
    setError(null);
    if (activeKey === key) {
      setLastResult(null);
    }
    shutdownInstance(key).catch((e) => setError(String(e)));
  };

  const handleTrack = () => {
    setError(null);
    if (!activeInstance) {
      setError("No instance selected");
      return;
    }

    let data;
    if (trackData.trim()) {
      try {
        data = JSON.parse(trackData);
      } catch {
        setError("Invalid JSON in data field");
        return;
      }
    }

    activeInstance
      .track(trackName, trackType, data)
      .then((result) => {
        setLastResult(result);
      })
      .catch((e) => setError(String(e)));
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.sectionTitle}>Create Instance</Text>
        <TextInput
          style={styles.input}
          placeholder="Account"
          value={account}
          onChangeText={setAccount}
        />
        <TextInput
          style={styles.input}
          placeholder="Profile"
          value={profile}
          onChangeText={setProfile}
        />
        <View style={styles.row}>
          {(["dev", "qa", "prod"] as const).map((env) => (
            <TouchableOpacity
              key={env}
              style={[
                styles.envButton,
                environment === env && styles.envButtonActive,
              ]}
              onPress={() => setEnvironment(env)}
            >
              <Text
                style={[
                  styles.envButtonText,
                  environment === env && styles.envButtonTextActive,
                ]}
              >
                {env}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setLogLevelDropdownOpen(true)}
        >
          <Text
            style={logLevel ? styles.dropdownText : styles.dropdownPlaceholder}
          >
            {logLevel ?? "Select Log Level"}
          </Text>
          <Text style={styles.dropdownChevron}>▾</Text>
        </TouchableOpacity>
        <Modal
          visible={logLevelDropdownOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setLogLevelDropdownOpen(false)}
        >
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setLogLevelDropdownOpen(false)}
          >
            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setLogLevel(null);
                  setLogLevelDropdownOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    logLevel === null && styles.dropdownItemTextSelected,
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>
              {LOG_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setLogLevel(level);
                    setLogLevelDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      logLevel === level && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
        <TouchableOpacity style={styles.button} onPress={handleCreate}>
          <Text style={styles.buttonText}>Create</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>
          Active Instances (tap to select)
        </Text>
        {instances.length === 0 ? (
          <Text style={styles.emptyText}>No instances created yet</Text>
        ) : (
          instances.map((info) => (
            <View
              key={info.key}
              style={[
                styles.instanceRow,
                activeKey === info.key && styles.instanceRowSelected,
              ]}
            >
              <TouchableOpacity
                style={styles.instanceMain}
                onPress={() => setActiveKey(info.key)}
              >
                <Text style={styles.instanceKey}>{info.key}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shutdownButton}
                onPress={() => handleShutdown(info.key)}
              >
                <Text style={styles.shutdownButtonText}>Shutdown</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {activeInstance && (
          <>
            <Text style={styles.sectionTitle}>Track Event/View</Text>
            <TextInput
              style={styles.input}
              placeholder="Event/View Name"
              value={trackName}
              onChangeText={setTrackName}
            />
            <View style={styles.row}>
              {(["event", "view"] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.envButton,
                    trackType === type && styles.envButtonActive,
                  ]}
                  onPress={() => setTrackType(type)}
                >
                  <Text
                    style={[
                      styles.envButtonText,
                      trackType === type && styles.envButtonTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder='Custom Data (JSON, e.g. {"screen": "home"})'
              value={trackData}
              onChangeText={setTrackData}
              multiline
            />
            <TouchableOpacity style={styles.button} onPress={handleTrack}>
              <Text style={styles.buttonText}>Track</Text>
            </TouchableOpacity>
          </>
        )}

        {error && (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {lastResult && (
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
                <Text style={styles.toastText}>
                  Status: {lastResult.status}
                </Text>
                <Text style={styles.toastText}>Info: {lastResult.info}</Text>
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
      )}

      <Modal
        visible={showPayloadModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPayloadModal(false);
          hideToast();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dispatch Payload</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPayloadModal(false);
                  hideToast();
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalNotice}>
              <Text style={styles.modalNoticeText}>
                💡 Payload logged to dev console
              </Text>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.payloadText}>
                {lastResult ? JSON.stringify(lastResult.payload, null, 2) : ""}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
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
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 80,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  envButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#007AFF",
    alignItems: "center",
  },
  envButtonActive: {
    backgroundColor: "#007AFF",
  },
  envButtonText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  envButtonTextActive: {
    color: "#fff",
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
  emptyText: {
    color: "#666",
    fontStyle: "italic",
    marginBottom: 12,
  },
  instanceRow: {
    flexDirection: "row",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    overflow: "hidden",
  },
  instanceRowSelected: {
    borderColor: "#007AFF",
    borderWidth: 2,
  },
  instanceMain: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  instanceKey: {
    fontSize: 14,
    fontFamily: "monospace",
  },
  shutdownButton: {
    backgroundColor: "#ff3b30",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  shutdownButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
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
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  dropdownText: {
    fontSize: 15,
    color: "#000",
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: "#999",
  },
  dropdownChevron: {
    fontSize: 14,
    color: "#666",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    padding: 32,
  },
  dropdownMenu: {
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#333",
  },
  dropdownItemTextSelected: {
    color: "#007AFF",
    fontWeight: "600",
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
