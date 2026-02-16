/**
 * Tealium Prism React Native Example App
 *
 * Demonstrates: Start/Stop SDK, tracking (view/event), flush, data layer,
 * trace, visitor identity (email), Moments API, deep links,
 * and consent (CMP) management with decision type and purposes.
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
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Tealium, {
  type EngineResponse,
  type TransactionContext,
  type ConsentDecision,
  type ConsentDecisionType,
} from 'tealium-prism-react-native';
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
  const [engineId, setEngineId] = useState('');
  const [engineResponse, setEngineResponse] = useState<EngineResponse | null>(
    null
  );
  const [engineLoading, setEngineLoading] = useState(false);
  const [dataLayerEventsEnabled, setDataLayerEventsEnabled] = useState(false);
  
  // Consent state
  const [consentDecisionType, setConsentDecisionType] = useState<ConsentDecisionType>('implicit');
  const [consentPurposes, setConsentPurposes] = useState<string[]>([]);
  const [allPurposes, setAllPurposes] = useState<string[]>([]);
  const [savedConsentDecision, setSavedConsentDecision] = useState<ConsentDecision | null>(null);
  const [consentHasUnsavedChanges, setConsentHasUnsavedChanges] = useState(false);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(80)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataUpdateSubscription = useRef<{ remove: () => void } | null>(null);
  const dataRemoveSubscription = useRef<{ remove: () => void } | null>(null);
  const consentSubscription = useRef<(() => void) | null>(null);

  useEffect(() => {
    initializeTealium();
    return () => {
      TealiumHelper.stopTealium();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      dataUpdateSubscription.current?.remove();
      dataRemoveSubscription.current?.remove();
      consentSubscription.current?.();
    };
  }, []);

  // Load consent data when initialized
  useEffect(() => {
    if (!isInitialized) return;
    
    const loadConsentData = async () => {
      const purposes = await Tealium.consent.getAllPurposes();
      setAllPurposes(purposes);
      
      const decision = await Tealium.consent.getDecision();
      if (decision) {
        setConsentDecisionType(decision.decisionType);
        setConsentPurposes(decision.purposes);
        setSavedConsentDecision(decision);
      }
    };
    
    loadConsentData();
    
    // Subscribe to consent changes
    consentSubscription.current = Tealium.consent.onDecisionChanged((decision) => {
      if (decision) {
        setConsentDecisionType(decision.decisionType);
        setConsentPurposes(decision.purposes);
        setSavedConsentDecision(decision);
        setConsentHasUnsavedChanges(false);
      }
    });
    
    return () => {
      consentSubscription.current?.();
      consentSubscription.current = null;
    };
  }, [isInitialized]);

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
    } catch (error) {
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
  // MomentsAPI Actions
  // ============================================

  const handleFetchEngineResponse = useCallback(async () => {
    if (!engineId) {
      showToast('Please enter an engine ID');
      return;
    }

    setEngineLoading(true);
    setEngineResponse(null);
    const response = await TealiumHelper.fetchEngineResponse(engineId);
    setEngineLoading(false);
    if (response) {
      setEngineResponse(response);
      showToast('Engine response loaded');
    } else {
      showToast('No engine response (MomentsAPI may not be configured)');
    }
  }, [engineId, showToast]);

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

  // Track unsaved changes
  useEffect(() => {
    if (!savedConsentDecision) {
      setConsentHasUnsavedChanges(false);
      return;
    }
    
    const typeChanged = consentDecisionType !== savedConsentDecision.decisionType;
    const purposesChanged = 
      consentPurposes.length !== savedConsentDecision.purposes.length ||
      !consentPurposes.every(p => savedConsentDecision.purposes.includes(p));
    
    setConsentHasUnsavedChanges(typeChanged || purposesChanged);
  }, [consentDecisionType, consentPurposes, savedConsentDecision]);

  const handleToggleConsentPurpose = useCallback((purpose: string) => {
    setConsentPurposes(prev => 
      prev.includes(purpose) 
        ? prev.filter(p => p !== purpose)
        : [...prev, purpose]
    );
  }, []);

  const handleSaveConsent = useCallback(async () => {
    const decision: ConsentDecision = {
      decisionType: consentDecisionType,
      purposes: consentPurposes,
    };
    
    await Tealium.consent.setDecision(decision);
    setSavedConsentDecision(decision);
    setConsentHasUnsavedChanges(false);
    showToast('Consent settings saved');
  }, [consentDecisionType, consentPurposes, showToast]);

  const handleDiscardConsentChanges = useCallback(() => {
    if (savedConsentDecision) {
      setConsentDecisionType(savedConsentDecision.decisionType);
      setConsentPurposes(savedConsentDecision.purposes);
    }
    setConsentHasUnsavedChanges(false);
    showToast('Consent changes discarded');
  }, [savedConsentDecision, showToast]);

  // ============================================
  // Misc Actions
  // ============================================

  const handleShutdown = useCallback(() => {
    TealiumHelper.stopTealium();
    setIsInitialized(false);
    setEngineResponse(null);
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

        <Section title="Consent (CMP)">
          {allPurposes.length > 0 ? (
            <>
              {/* Decision Type Toggle */}
              <View style={styles.consentToggleRow}>
                <Text style={styles.consentLabel}>Decision Type:</Text>
                <View style={styles.consentToggleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.consentToggleButton,
                      consentDecisionType === 'implicit' && styles.consentToggleButtonActive,
                    ]}
                    onPress={() => setConsentDecisionType('implicit')}
                  >
                    <Text style={[
                      styles.consentToggleText,
                      consentDecisionType === 'implicit' && styles.consentToggleTextActive,
                    ]}>Implicit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.consentToggleButton,
                      consentDecisionType === 'explicit' && styles.consentToggleButtonActive,
                    ]}
                    onPress={() => setConsentDecisionType('explicit')}
                  >
                    <Text style={[
                      styles.consentToggleText,
                      consentDecisionType === 'explicit' && styles.consentToggleTextActive,
                    ]}>Explicit</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Purposes Checkboxes */}
              <Text style={styles.consentLabel}>Purposes:</Text>
              {allPurposes.map((purpose) => (
                <TouchableOpacity
                  key={purpose}
                  style={styles.consentCheckboxRow}
                  onPress={() => handleToggleConsentPurpose(purpose)}
                >
                  <View style={[
                    styles.consentCheckbox,
                    consentPurposes.includes(purpose) && styles.consentCheckboxChecked,
                  ]}>
                    {consentPurposes.includes(purpose) && (
                      <Text style={styles.consentCheckmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.consentPurposeText}>{purpose}</Text>
                </TouchableOpacity>
              ))}

              {/* Unsaved Changes Warning */}
              {consentHasUnsavedChanges && (
                <View style={styles.consentWarning}>
                  <Text style={styles.consentWarningText}>
                    You have unsaved changes
                  </Text>
                </View>
              )}

              {/* Save/Discard Buttons */}
              <View style={styles.consentButtonRow}>
                <TouchableOpacity
                  style={[styles.consentButton, styles.consentSaveButton]}
                  onPress={handleSaveConsent}
                >
                  <Text style={styles.consentButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.consentButton,
                    styles.consentDiscardButton,
                    !consentHasUnsavedChanges && styles.consentButtonDisabled,
                  ]}
                  onPress={handleDiscardConsentChanges}
                  disabled={!consentHasUnsavedChanges}
                >
                  <Text style={[
                    styles.consentButtonText,
                    !consentHasUnsavedChanges && styles.consentButtonTextDisabled,
                  ]}>Discard</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.helperText}>
              Consent is not configured. Enable consent in TealiumHelper config.
            </Text>
          )}
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

        <Section title="Moments API">
          <TextInput
            style={styles.input}
            placeholder="Enter engine ID"
            placeholderTextColor="#666"
            value={engineId}
            onChangeText={setEngineId}
            autoCapitalize="none"
          />
          <Button
            title="Fetch Engine Response"
            onPress={handleFetchEngineResponse}
            disabled={engineLoading}
          />
          {engineLoading && (
            <ActivityIndicator
              style={styles.loader}
              size="small"
              color="#007CC1"
            />
          )}
          {engineResponse && (
            <View style={styles.engineResponse}>
              {engineResponse.audiences?.length ? (
                <View style={styles.engineRow}>
                  <Text style={styles.engineLabel}>Audiences</Text>
                  <Text style={styles.engineValue}>
                    {engineResponse.audiences.join('\n')}
                  </Text>
                </View>
              ) : null}
              {engineResponse.badges?.length ? (
                <View style={styles.engineRow}>
                  <Text style={styles.engineLabel}>Badges</Text>
                  <Text style={styles.engineValue}>
                    {engineResponse.badges.join('\n')}
                  </Text>
                </View>
              ) : null}
              {engineResponse.properties &&
              Object.keys(engineResponse.properties).length > 0 ? (
                <View style={styles.engineRow}>
                  <Text style={styles.engineLabel}>Properties</Text>
                  <Text style={styles.engineValue}>
                    {Object.entries(engineResponse.properties)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join('\n')}
                  </Text>
                </View>
              ) : null}
              {engineResponse.metrics &&
              Object.keys(engineResponse.metrics).length > 0 ? (
                <View style={styles.engineRow}>
                  <Text style={styles.engineLabel}>Metrics</Text>
                  <Text style={styles.engineValue}>
                    {Object.entries(engineResponse.metrics)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join('\n')}
                  </Text>
                </View>
              ) : null}
              {engineResponse.flags &&
              Object.keys(engineResponse.flags).length > 0 ? (
                <View style={styles.engineRow}>
                  <Text style={styles.engineLabel}>Flags</Text>
                  <Text style={styles.engineValue}>
                    {Object.entries(engineResponse.flags)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join('\n')}
                  </Text>
                </View>
              ) : null}
              {engineResponse.dates &&
              Object.keys(engineResponse.dates).length > 0 ? (
                <View style={styles.engineRow}>
                  <Text style={styles.engineLabel}>Dates</Text>
                  <Text style={styles.engineValue}>
                    {Object.entries(engineResponse.dates)
                      .map(([k, v]) => `${k}: ${new Date(v).toLocaleString()}`)
                      .join('\n')}
                  </Text>
                </View>
              ) : null}
              {!engineResponse.audiences?.length &&
                !engineResponse.badges?.length &&
                !(
                  engineResponse.properties &&
                  Object.keys(engineResponse.properties).length > 0
                ) &&
                !(
                  engineResponse.metrics &&
                  Object.keys(engineResponse.metrics).length > 0
                ) &&
                !(
                  engineResponse.flags &&
                  Object.keys(engineResponse.flags).length > 0
                ) &&
                !(
                  engineResponse.dates &&
                  Object.keys(engineResponse.dates).length > 0
                ) && <Text style={styles.engineValue}>Empty response</Text>}
            </View>
          )}
        </Section>

        <Section title="Trace (Extended)">
          <Button
            title="Force End of Visit"
            onPress={handleForceEndOfVisit}
            color="#dc3545"
          />
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
  // Consent styles
  consentToggleRow: {
    marginBottom: 15,
  },
  consentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  consentToggleButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  consentToggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007CC1',
    backgroundColor: '#fff',
  },
  consentToggleButtonActive: {
    backgroundColor: '#007CC1',
  },
  consentToggleText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#007CC1',
    fontWeight: '500',
  },
  consentToggleTextActive: {
    color: '#fff',
  },
  consentCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  consentCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007CC1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  consentCheckboxChecked: {
    backgroundColor: '#007CC1',
  },
  consentCheckmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  consentPurposeText: {
    fontSize: 14,
    color: '#333',
  },
  consentWarning: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginVertical: 10,
  },
  consentWarningText: {
    color: '#856404',
    fontSize: 13,
    textAlign: 'center',
  },
  consentButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  consentButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  consentSaveButton: {
    backgroundColor: '#28a745',
  },
  consentDiscardButton: {
    backgroundColor: '#dc3545',
  },
  consentButtonDisabled: {
    backgroundColor: '#ccc',
  },
  consentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  consentButtonTextDisabled: {
    color: '#999',
  },
});
