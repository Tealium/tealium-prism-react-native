/**
 * Tealium Prism React Native Example App
 *
 * Demonstrates: Start/Stop SDK, tracking (view/event), flush, data layer,
 * trace, visitor identity (email), Moments API, and deep links.
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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Tealium, { type TransactionContext } from 'tealium-prism-react-native';
import TealiumHelper from './TealiumHelper';

// ============================================
// Types
// ============================================

interface ButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
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
  disabled = false,
}) => (
  <TouchableOpacity
    style={[
      styles.button,
      { backgroundColor: color },
      disabled && styles.buttonDisabled,
    ]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
      {title}
    </Text>
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
  const [email, setEmail] = useState('');
  const [dataLayerEventsEnabled, setDataLayerEventsEnabled] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(80)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataUpdateSubscription = useRef<{ remove: () => void } | null>(null);
  const dataRemoveSubscription = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    initializeTealium();
    return () => {
      TealiumHelper.stopTealium();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      dataUpdateSubscription.current?.remove();
      dataRemoveSubscription.current?.remove();
    };
  }, []);

  // Forward incoming deep links (tealium://, myapp://) to Prism for attribution and trace
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      if (TealiumHelper.isEnabled) {
        TealiumHelper.handleDeepLink(event.url);
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  // Handle app launch from a deep link (process URL after SDK is ready)
  useEffect(() => {
    if (!isInitialized) return;
    Linking.getInitialURL().then((url) => {
      if (url) TealiumHelper.handleDeepLink(url);
    });
  }, [isInitialized]);

  const initializeTealium = async () => {
    const config =
      Platform.OS === 'android'
        ? { settingsFile: 'TealiumSettings.json' as const }
        : undefined;
    const success = await TealiumHelper.startTealium(config);

    setIsInitialized(success);

    if (success) {
      TealiumHelper.trackView('app_launched');
      const storedEmail = await TealiumHelper.getData('email');
      setEmail(typeof storedEmail === 'string' ? storedEmail : '');
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
    TealiumHelper.trackView('screen_view');
    showToast('View tracked: screen_view');
  }, [showToast]);

  const handleTrackEvent = useCallback(() => {
    TealiumHelper.trackEvent('button_tapped', {
      event_category: 'example',
      event_action: 'tap',
      event_label: 'Track Event',
    });
    showToast('Event tracked: button_tapped');
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
  // Transactional Operations
  // ============================================

  const handleTransactionalUpdate = useCallback(async () => {
    try {
      await Tealium.dataLayer.transactionally(
        (ctx: TransactionContext) => {
          ctx.put('tx_key1', 'value1', 'session');
          ctx.put('tx_key2', 'value2', 'forever');
          ctx.remove('tx_key3');
          const count = (ctx.get('tx_counter') as number) ?? 0;
          ctx.put('tx_counter', count + 1, 'forever');
        },
        ['tx_counter']
      );
      showToast('Transactional update completed');
    } catch {
      showToast('Transactional update failed');
    }
  }, [showToast]);

  const handleGetTransactionCounter = useCallback(async () => {
    const count = await Tealium.dataLayer.get('tx_counter');
    showToast(`tx_counter = ${count ?? 'null'}`);
  }, [showToast]);

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
  // Visitor Identity & Visitor ID
  // ============================================

  const handleSetEmail = useCallback(() => {
    if (email.trim()) {
      TealiumHelper.addData({ email: email.trim() }, 'forever');
      showToast('Email set in data layer');
    } else {
      TealiumHelper.removeData('email');
      setEmail('');
      showToast('Email cleared from data layer');
    }
  }, [email, showToast]);

  const handleClearEmail = useCallback(() => {
    TealiumHelper.removeData('email');
    setEmail('');
    showToast('Email cleared from data layer');
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
  // Consent Actions
  // ============================================

  const handleGrantConsent = useCallback(() => {
    Tealium.consent.setDecision('explicit', [
      'analytics',
      'marketing',
      'personalization',
    ]);
    showToast('Consent granted (explicit, all purposes)');
  }, [showToast]);

  const handlePartialConsent = useCallback(() => {
    Tealium.consent.setDecision('explicit', ['analytics']);
    showToast('Consent granted (explicit, analytics only)');
  }, [showToast]);

  const handleImplicitConsent = useCallback(() => {
    Tealium.consent.setDecision('implicit', ['analytics']);
    showToast('Implicit consent set (analytics only)');
  }, [showToast]);

  const handleRevokeConsent = useCallback(() => {
    Tealium.consent.reset();
    showToast('Consent revoked');
  }, [showToast]);

  const handleGetConsent = useCallback(async () => {
    const decision = await Tealium.consent.getDecision();
    if (decision) {
      showToast(`${decision.decisionType}: ${decision.purposes.join(', ')}`);
    } else {
      showToast('No consent decision set');
    }
  }, [showToast]);

  // ============================================
  // Misc Actions
  // ============================================

  const handleShutdown = useCallback(() => {
    TealiumHelper.stopTealium();
    setIsInitialized(false);
    showToast('Tealium stopped');
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

        <Section title="Instance">
          <Button
            title={isInitialized ? 'Stop Tealium' : 'Start Tealium'}
            onPress={isInitialized ? handleShutdown : handleReinitialize}
            color={isInitialized ? '#dc3545' : '#28a745'}
          />
        </Section>

        <Section title="Tracking">
          <Button title="Track View" onPress={handleTrackView} />
          <Button title="Track Event" onPress={handleTrackEvent} />
          <Button title="Flush Event Queue" onPress={handleFlush} />
        </Section>

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
          <Button title="Add Data" onPress={handleAddData} />
          <Button title="Get Data" onPress={handleGetData} />
          <Button title="Remove Data" onPress={handleRemoveData} />
        </Section>

        <Section title="Transactional Operations">
          <Button
            title="Transactional Update"
            onPress={handleTransactionalUpdate}
          />
          <Button
            title="Get Transaction Counter"
            onPress={handleGetTransactionCounter}
          />
          <Text style={styles.helperText}>
            Atomically updates multiple keys: tx_key1, tx_key2, removes tx_key3,
            and increments tx_counter.
          </Text>
        </Section>

        <Section title="Trace">
          <TextInput
            style={styles.input}
            placeholder="Enter trace ID"
            placeholderTextColor="#666"
            value={traceId}
            onChangeText={setTraceId}
            autoCapitalize="none"
          />
          <Button title="Start Trace" onPress={handleJoinTrace} />
          <Button title="Leave Trace" onPress={handleLeaveTrace} />
        </Section>

        <Section title="Visitor Identity (Email)">
          <TextInput
            style={styles.input}
            placeholder="Enter email (visitor identity key)"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button title="Set Email" onPress={handleSetEmail} />
          <Button title="Clear Email" onPress={handleClearEmail} />
        </Section>

        <Section title="Visitor">
          <Button title="Reset Visitor ID" onPress={handleResetVisitorId} />
          <Button title="Clear Stored IDs" onPress={handleClearVisitorIds} />
        </Section>

        <Section title="Trace (Extended)">
          <Button
            title="Force End of Visit"
            onPress={handleForceEndOfVisit}
            color="#dc3545"
          />
        </Section>

        <Section title="Consent">
          <Button
            title="Grant All (Explicit)"
            onPress={handleGrantConsent}
            color="#28a745"
          />
          <Button
            title="Partial Consent (Explicit, Analytics Only)"
            onPress={handlePartialConsent}
          />
          <Button
            title="Implicit (Analytics Only)"
            onPress={handleImplicitConsent}
          />
          <Button
            title="Revoke Consent"
            onPress={handleRevokeConsent}
            color="#dc3545"
          />
          <Button title="Get Consent Status" onPress={handleGetConsent} />
        </Section>

        <Section title="DataLayer Events">
          <Button
            title={dataLayerEventsEnabled ? 'Disable Events' : 'Enable Events'}
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonTextDisabled: {
    color: 'rgba(255,255,255,0.8)',
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
  loader: {
    marginVertical: 8,
  },
  engineResponse: {
    marginTop: 12,
    backgroundColor: '#e8e8e8',
    borderRadius: 8,
    padding: 12,
  },
  engineRow: {
    marginBottom: 12,
  },
  engineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007CC1',
    marginBottom: 4,
  },
  engineValue: {
    fontSize: 13,
    color: '#333',
    paddingLeft: 8,
  },
});
