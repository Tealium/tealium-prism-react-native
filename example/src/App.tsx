import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Text,
  ScrollView,
  Platform,
  Animated,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { version as sdkVersion } from 'tealium-prism-react-native/package.json';
import TealiumHelper from './TealiumHelper';
import { Button, Section, Snackbar, TOAST_DURATION_MS, styles } from './components';
import { TrackingSection } from './sections/TrackingSection';
import { DataLayerSection } from './sections/DataLayerSection';
import { TraceSection } from './sections/TraceSection';
import { VisitorSection } from './sections/VisitorSection';
import { ConsentSection } from './sections/ConsentSection';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initialEmail, setInitialEmail] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(80)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    initializeTealium();
    return () => {
      TealiumHelper.stopTealium();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Forward incoming deep links to Prism for attribution and trace
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      if (TealiumHelper.isEnabled) TealiumHelper.handleDeepLink(event.url);
    };
    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  // Process launch URL once SDK is ready
  useEffect(() => {
    if (!isInitialized) return;
    Linking.getInitialURL().then((url) => {
      if (url) TealiumHelper.handleDeepLink(url);
    });
  }, [isInitialized]);

  const initializeTealium = async () => {
    const success = await TealiumHelper.startTealium();
    setIsInitialized(success);
    if (success) {
      TealiumHelper.trackView('app_launched');
      const storedEmail = await TealiumHelper.getData('email');
      setInitialEmail(typeof storedEmail === 'string' ? storedEmail : '');
    }
  };

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
        Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(toastTranslateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      toastTimeoutRef.current = setTimeout(() => {
        toastTimeoutRef.current = null;
        Animated.parallel([
          Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(toastTranslateY, { toValue: 80, duration: 200, useNativeDriver: true }),
        ]).start(() => {
          setToastVisible(false);
          setToastMessage(null);
        });
      }, TOAST_DURATION_MS);
    },
    [toastOpacity, toastTranslateY]
  );

  const handleShutdown = useCallback(() => {
    TealiumHelper.stopTealium();
    setIsInitialized(false);
    showToast('Tealium stopped');
  }, [showToast]);

  const handleReinitialize = useCallback(async () => {
    await initializeTealium();
    showToast('Tealium reinitialized');
  }, [showToast]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Tealium Prism React Native</Text>

        <Section title="Instance">
          <Button
            title={isInitialized ? 'Stop Tealium' : 'Start Tealium'}
            onPress={isInitialized ? handleShutdown : handleReinitialize}
            color={isInitialized ? '#dc3545' : '#28a745'}
          />
        </Section>

        <TrackingSection showToast={showToast} />
        <DataLayerSection showToast={showToast} />
        <TraceSection showToast={showToast} />
        <VisitorSection initialEmail={initialEmail} showToast={showToast} />
        <ConsentSection showToast={showToast} />

        <Section title=" ">
          <Text style={styles.footerText}>Tealium Prism React Native v{sdkVersion}</Text>
          <Text style={styles.footerText}>Platform: {Platform.OS} {Platform.Version}</Text>
        </Section>
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
