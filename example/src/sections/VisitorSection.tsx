import React, { useState, useCallback } from 'react';
import { TextInput } from 'react-native';
import { Button, Section, styles } from '../components';
import TealiumHelper from '../TealiumHelper';

interface Props {
  initialEmail: string;
  showToast: (msg: string) => void;
}

export const VisitorSection: React.FC<Props> = ({
  initialEmail,
  showToast,
}) => {
  const [email, setEmail] = useState(initialEmail);

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

  return (
    <Section title="Visitor">
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
      <Button title="Reset Visitor ID" onPress={handleResetVisitorId} />
      <Button title="Clear Stored IDs" onPress={handleClearVisitorIds} />
    </Section>
  );
};
