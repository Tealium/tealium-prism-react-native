/**
 * Tealium Prism React Native Example App
 *
 * Demonstrates all features of the Tealium Prism SDK wrapper:
 * - Initialization
 * - Event and View tracking
 * - Data Layer operations
 * - Trace/debugging
 * - Visitor management
 * - Consent management
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import TealiumHelper from './TealiumHelper';

// ============================================
// Types
// ============================================

interface ButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

// ============================================
// Components
// ============================================

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  color = '#007CC1',
}) => (
  <TouchableOpacity
    style={[styles.button, { backgroundColor: color }]}
    onPress={onPress}
  >
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
    {children}
  </View>
);

const TOAST_DURATION_MS = 3000;

const Snackbar: React.FC<{
  message: string | null;
  visible: boolean;
  opacity: Animated.Value;
  translateY: Animated.Value;
}> = ({ message, visible, opacity, translateY }) => {
  if (!visible || !message) return null;
  return (
    <Animated.View
      style={[
        styles.snackbar,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.snackbarText} numberOfLines={3}>
        {message}
      </Text>
    </Animated.View>
  );
};

// ============================================
// Main App
// ============================================

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [traceId, setTraceId] = useState('demo-trace');
  const [dataKey, setDataKey] = useState('example_key');
  const [dataValue, setDataValue] = useState('example_value');
  const [engineId, setEngineId] = useState('');
  const [dataLayerEventsEnabled, setDataLayerEventsEnabled] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(80)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataUpdateSubscription = useRef<{ remove: () => void } | null>(null);
  const dataRemoveSubscription = useRef<{ remove: () => void } | null>(null);

  // Initialize Tealium on mount
  useEffect(() => {
    initializeTealium();
    return () => {
      TealiumHelper.shutdown();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      dataUpdateSubscription.current?.remove();
      dataRemoveSubscription.current?.remove();
    };
  }, []);

  const initializeTealium = async () => {
    const success = await TealiumHelper.initialize({
      account: 'tealiummobile',
      profile: 'demo',
      environment: 'dev',
      settingsFile:
        Platform.OS === 'android' ? 'TealiumSettings.json' : 'TealiumSettings',
    });

    setIsInitialized(success);

    if (success) {
      TealiumHelper.trackView('app_launched');
    }
  };

  // ============================================
  // Helpers
  // ============================================

  const showToast = useCallback(
    (message: string) => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
      setToastMessage(message);
      setToastVisible(true);
      toastTranslateY.setValue(80);
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      toastTimeoutRef.current = setTimeout(() => {
        toastTimeoutRef.current = null;
        Animated.parallel([
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(toastTranslateY, {
            toValue: 80,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setToastVisible(false);
          setToastMessage(null);
        });
      }, TOAST_DURATION_MS);
    },
    [toastOpacity, toastTranslateY]
  );

  // ============================================
  // Tracking Actions
  // ============================================

  const handleTrackView = useCallback(() => {
    TealiumHelper.trackView('example_screen', {
      screen_name: 'Example Screen',
      timestamp: new Date().toISOString(),
    });
    showToast('View tracked: example_screen');
  }, [showToast]);

  const handleTrackEvent = useCallback(() => {
    TealiumHelper.trackEvent('button_click', {
      button_id: 'track_event_button',
      timestamp: new Date().toISOString(),
    });
    showToast('Event tracked: button_click');
  }, [showToast]);

  const handleFlush = useCallback(async () => {
    await TealiumHelper.flush();
    showToast('Event queue flushed');
  }, [showToast]);

  // ============================================
  // Data Layer Actions
  // ============================================

  const handleAddData = useCallback(() => {
    if (!dataKey || !dataValue) {
      showToast('Please enter both key and value');
      return;
    }

    TealiumHelper.addData({ [dataKey]: dataValue }, 'session');
    showToast(`Added: ${dataKey} = ${dataValue}`);
  }, [dataKey, dataValue, showToast]);

  const handleGetData = useCallback(async () => {
    if (!dataKey) {
      showToast('Please enter a key');
      return;
    }

    const value = await TealiumHelper.getData(dataKey);
    showToast(`${dataKey} = ${value ?? 'null'}`);
  }, [dataKey, showToast]);

  const handleRemoveData = useCallback(() => {
    if (!dataKey) {
      showToast('Please enter a key');
      return;
    }

    TealiumHelper.removeData(dataKey);
    showToast(`Removed: ${dataKey}`);
  }, [dataKey, showToast]);

  // ============================================
  // Trace Actions
  // ============================================

  const handleJoinTrace = useCallback(() => {
    if (!traceId) {
      showToast('Please enter a trace ID');
      return;
    }

    TealiumHelper.joinTrace(traceId);
    showToast(`Joined trace: ${traceId}`);
  }, [traceId, showToast]);

  const handleLeaveTrace = useCallback(() => {
    TealiumHelper.leaveTrace();
    showToast('Left trace session');
  }, [showToast]);

  // ============================================
  // Visitor Actions
  // ============================================

  const handleGetVisitorId = useCallback(async () => {
    const vid = await TealiumHelper.getVisitorId();
    showToast(`Visitor ID: ${vid ?? 'null'}`);
  }, [showToast]);

  const handleResetVisitorId = useCallback(async () => {
    const newId = await TealiumHelper.resetVisitorId();
    showToast(`New Visitor ID: ${newId}`);
  }, [showToast]);

  const handleClearVisitorIds = useCallback(async () => {
    const newId = await TealiumHelper.clearStoredVisitorIds();
    showToast(`Cleared. New ID: ${newId}`);
  }, [showToast]);

  // ============================================
  // Consent Actions
  // ============================================

  const handleSetConsented = useCallback(() => {
    TealiumHelper.setConsentStatus('consented');
    showToast('Consent status: consented');
  }, [showToast]);

  const handleSetNotConsented = useCallback(() => {
    TealiumHelper.setConsentStatus('notConsented');
    showToast('Consent status: notConsented');
  }, [showToast]);

  const handleResetConsent = useCallback(() => {
    TealiumHelper.setConsentStatus('unknown');
    showToast('Consent status: unknown');
  }, [showToast]);

  const handleGetConsentStatus = useCallback(async () => {
    const status = await TealiumHelper.getConsentStatus();
    showToast(`Consent status: ${status}`);
  }, [showToast]);

  const handleSetConsentCategories = useCallback(() => {
    const categories = ['analytics', 'personalization', 'social'] as const;
    TealiumHelper.setConsentCategories([...categories]);
    showToast(`Set categories: ${categories.join(', ')}`);
  }, [showToast]);

  const handleGetConsentCategories = useCallback(async () => {
    const categories = await TealiumHelper.getConsentCategories();
    if (categories.length > 0) {
      showToast(`Categories: ${categories.join(', ')}`);
    } else {
      showToast('No consent categories set');
    }
  }, [showToast]);

  // ============================================
  // MomentsAPI Actions
  // ============================================

  const handleFetchEngineResponse = useCallback(async () => {
    if (!engineId) {
      showToast('Please enter an engine ID');
      return;
    }

    const response = await TealiumHelper.fetchEngineResponse(engineId);
    if (response) {
      const summary = [];
      if (response.audiences?.length) {
        summary.push(`Audiences: ${response.audiences.length}`);
      }
      if (response.badges?.length) {
        summary.push(`Badges: ${response.badges.length}`);
      }
      showToast(`Engine Response: ${summary.join(', ') || 'Empty'}`);
    } else {
      showToast('No engine response (MomentsAPI may not be configured)');
    }
  }, [engineId, showToast]);

  // ============================================
  // Lifecycle Manual Actions
  // ============================================

  const handleLifecycleLaunch = useCallback(async () => {
    await TealiumHelper.lifecycleLaunch({ manual_launch: true });
    showToast('Lifecycle launch tracked');
  }, [showToast]);

  const handleLifecycleWake = useCallback(async () => {
    await TealiumHelper.lifecycleWake({ manual_wake: true });
    showToast('Lifecycle wake tracked');
  }, [showToast]);

  const handleLifecycleSleep = useCallback(async () => {
    await TealiumHelper.lifecycleSleep({ manual_sleep: true });
    showToast('Lifecycle sleep tracked');
  }, [showToast]);

  // ============================================
  // Trace Extended Actions
  // ============================================

  const handleForceEndOfVisit = useCallback(() => {
    TealiumHelper.forceEndOfVisit();
    showToast('Forced end of visit');
  }, [showToast]);

  // ============================================
  // DataLayer Events Actions
  // ============================================

  const handleToggleDataLayerEvents = useCallback(() => {
    if (dataLayerEventsEnabled) {
      dataUpdateSubscription.current?.remove();
      dataRemoveSubscription.current?.remove();
      dataUpdateSubscription.current = null;
      dataRemoveSubscription.current = null;
      setDataLayerEventsEnabled(false);
      showToast('DataLayer events disabled');
    } else {
      dataUpdateSubscription.current = TealiumHelper.onDataUpdated((data) => {
        console.log('[App] DataLayer updated:', data);
        showToast(`DataLayer updated: ${Object.keys(data).join(', ')}`);
      });
      dataRemoveSubscription.current = TealiumHelper.onDataRemoved((keys) => {
        console.log('[App] DataLayer keys removed:', keys);
        showToast(`DataLayer keys removed: ${keys.join(', ')}`);
      });
      setDataLayerEventsEnabled(true);
      showToast('DataLayer events enabled');
    }
  }, [dataLayerEventsEnabled, showToast]);

  // ============================================
  // Misc Actions
  // ============================================

  const handleShutdown = useCallback(() => {
    TealiumHelper.shutdown();
    setIsInitialized(false);
    showToast('Tealium shutdown');
  }, [showToast]);

  const handleReinitialize = useCallback(async () => {
    await initializeTealium();
    showToast('Tealium reinitialized');
  }, [showToast]);

  // ============================================
  // Render
  // ============================================

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Tealium Prism React Native</Text>

        {/* Instance – Initialize first */}
        <Section title="Instance">
          <Button
            title={isInitialized ? 'SHUTDOWN' : 'INITIALIZE'}
            onPress={isInitialized ? handleShutdown : handleReinitialize}
            color={isInitialized ? '#dc3545' : '#28a745'}
          />
        </Section>

        {/* Tracking Section */}
        <Section title="Tracking">
          <Button title="TRACK VIEW" onPress={handleTrackView} />
          <Button title="TRACK EVENT" onPress={handleTrackEvent} />
          <Button title="FLUSH QUEUE" onPress={handleFlush} />
        </Section>

        {/* Data Layer Section */}
        <Section title="Data Layer">
          <TextInput
            style={styles.input}
            placeholder="Enter key"
            placeholderTextColor="#666"
            value={dataKey}
            onChangeText={setDataKey}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter value"
            placeholderTextColor="#666"
            value={dataValue}
            onChangeText={setDataValue}
          />
          <Button title="ADD DATA" onPress={handleAddData} />
          <Button title="GET DATA" onPress={handleGetData} />
          <Button title="REMOVE DATA" onPress={handleRemoveData} />
        </Section>

        {/* Trace Section */}
        <Section title="Trace">
          <TextInput
            style={styles.input}
            placeholder="Enter trace ID"
            placeholderTextColor="#666"
            value={traceId}
            onChangeText={setTraceId}
            autoCapitalize="none"
          />
          <Button title="JOIN TRACE" onPress={handleJoinTrace} />
          <Button title="LEAVE TRACE" onPress={handleLeaveTrace} />
        </Section>

        {/* Visitor Section */}
        <Section title="Visitor">
          <Button title="GET VISITOR ID" onPress={handleGetVisitorId} />
          <Button title="RESET VISITOR ID" onPress={handleResetVisitorId} />
          <Button title="CLEAR STORED IDS" onPress={handleClearVisitorIds} />
        </Section>

        {/* Consent Section */}
        <Section title="Consent">
          <Button
            title="OPT IN (CONSENTED)"
            onPress={handleSetConsented}
            color="#28a745"
          />
          <Button
            title="OPT OUT (NOT CONSENTED)"
            onPress={handleSetNotConsented}
            color="#dc3545"
          />
          <Button title="RESET CONSENT" onPress={handleResetConsent} />
          <Button title="GET CONSENT STATUS" onPress={handleGetConsentStatus} />
          <Button
            title="SET CONSENT CATEGORIES"
            onPress={handleSetConsentCategories}
          />
          <Button
            title="GET CONSENT CATEGORIES"
            onPress={handleGetConsentCategories}
          />
        </Section>

        {/* MomentsAPI Section */}
        <Section title="MomentsAPI">
          <TextInput
            style={styles.input}
            placeholder="Enter engine ID"
            placeholderTextColor="#666"
            value={engineId}
            onChangeText={setEngineId}
            autoCapitalize="none"
          />
          <Button
            title="FETCH ENGINE RESPONSE"
            onPress={handleFetchEngineResponse}
          />
        </Section>

        {/* Lifecycle Manual Section */}
        <Section title="Lifecycle (Manual)">
          <Button title="LAUNCH" onPress={handleLifecycleLaunch} />
          <Button title="WAKE" onPress={handleLifecycleWake} />
          <Button title="SLEEP" onPress={handleLifecycleSleep} />
        </Section>

        {/* Trace Extended Section */}
        <Section title="Trace (Extended)">
          <Button
            title="FORCE END OF VISIT"
            onPress={handleForceEndOfVisit}
            color="#dc3545"
          />
        </Section>

        {/* DataLayer Events Section */}
        <Section title="DataLayer Events">
          <Button
            title={dataLayerEventsEnabled ? 'DISABLE EVENTS' : 'ENABLE EVENTS'}
            onPress={handleToggleDataLayerEvents}
            color={dataLayerEventsEnabled ? '#dc3545' : '#28a745'}
          />
          <Text style={styles.helperText}>
            When enabled, adding/removing data will show a toast.
          </Text>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Tealium Prism React Native v0.1.0
          </Text>
          <Text style={styles.footerText}>
            Platform: {Platform.OS} {Platform.Version}
          </Text>
        </View>
      </ScrollView>
      <Snackbar
        message={toastMessage}
        visible={toastVisible}
        opacity={toastOpacity}
        translateY={toastTranslateY}
      />
    </SafeAreaView>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  snackbar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: Platform.select({ ios: 34, android: 24 }),
    backgroundColor: '#323232',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  snackbarText: {
    color: '#fff',
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 15,
  },
  button: {
    backgroundColor: '#007CC1',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007CC1',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
    fontSize: 14,
    color: '#333',
  },
  footer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
});
