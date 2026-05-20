import React, { useState, useCallback, useRef } from 'react';
import { Text } from 'react-native';
import { type Disposable as TealiumDisposable } from 'tealium-prism-react-native';
import { Button, Section, styles } from '../components';
import TealiumHelper from '../TealiumHelper';

interface Props {
  showToast: (msg: string) => void;
}

export const ConsentSection: React.FC<Props> = ({ showToast }) => {
  const [subscribed, setSubscribed] = useState(false);
  const [lastDecision, setLastDecision] = useState<string>('—');
  const subscription = useRef<TealiumDisposable | null>(null);

  const handleGrantAll = useCallback(() => {
    TealiumHelper.setConsentDecision('explicit', [
      'analytics',
      'marketing',
      'personalization',
    ]);
    showToast('Consent granted (explicit, all purposes)');
  }, [showToast]);

  const handlePartial = useCallback(() => {
    TealiumHelper.setConsentDecision('explicit', ['analytics']);
    showToast('Consent granted (explicit, analytics only)');
  }, [showToast]);

  const handleImplicit = useCallback(() => {
    TealiumHelper.setConsentDecision('implicit', ['analytics']);
    showToast('Implicit consent set (analytics only)');
  }, [showToast]);

  const handleRevoke = useCallback(() => {
    TealiumHelper.resetConsentDecision();
    showToast('Consent revoked');
  }, [showToast]);

  const handleGetDecision = useCallback(async () => {
    const decision = await TealiumHelper.getConsentDecision();
    if (decision) {
      showToast(`${decision.decisionType}: ${decision.purposes.join(', ')}`);
    } else {
      showToast('No consent decision set');
    }
  }, [showToast]);

  const handleGetAllPurposes = useCallback(async () => {
    const purposes = await TealiumHelper.getAllConsentPurposes();
    if (purposes && purposes.length > 0) {
      showToast(`All purposes: ${purposes.join(', ')}`);
    } else {
      showToast('No purposes available (consent not configured?)');
    }
  }, [showToast]);

  const handleSubscribe = useCallback(() => {
    if (subscribed) return;
    subscription.current = TealiumHelper.onConsentDecisionChanged(
      (decision) => {
        if (decision) {
          setLastDecision(
            `${decision.decisionType}: ${decision.purposes.join(', ')}`
          );
        } else {
          setLastDecision('null (reset)');
        }
      }
    );
    setSubscribed(true);
    showToast('Subscribed to consent changes');
  }, [subscribed, showToast]);

  const handleDispose = useCallback(() => {
    if (!subscribed) return;
    subscription.current?.dispose();
    subscription.current = null;
    setSubscribed(false);
    setLastDecision('—');
    showToast('Unsubscribed from consent changes');
  }, [subscribed, showToast]);

  return (
    <>
      <Section title="Consent Observable">
        <Button
          title="Subscribe to Decision Changes"
          onPress={handleSubscribe}
          color="#28a745"
          disabled={subscribed}
        />
        <Button
          title="Dispose Subscription"
          onPress={handleDispose}
          color="#dc3545"
          disabled={!subscribed}
        />
        <Text style={styles.helperText}>
          Last decision:{' '}
          <Text style={styles.highlightText}>{lastDecision}</Text>
        </Text>
      </Section>

      <Section title="Consent">
        <Button
          title="Grant All (Explicit)"
          onPress={handleGrantAll}
          color="#28a745"
        />
        <Button
          title="Partial Consent (Explicit, Analytics Only)"
          onPress={handlePartial}
        />
        <Button title="Implicit (Analytics Only)" onPress={handleImplicit} />
        <Button title="Revoke Consent" onPress={handleRevoke} color="#dc3545" />
        <Button title="Get Consent Status" onPress={handleGetDecision} />
        <Button title="Get All Purposes" onPress={handleGetAllPurposes} />
      </Section>
    </>
  );
};
