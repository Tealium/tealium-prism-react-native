import React, { useState, useCallback } from 'react';
import { TextInput } from 'react-native';
import { Button, Section, styles } from '../components';
import TealiumHelper from '../TealiumHelper';

interface Props {
  showToast: (msg: string) => void;
}

export const TraceSection: React.FC<Props> = ({ showToast }) => {
  const [traceId, setTraceId] = useState('demo-trace');

  const handleJoinTrace = useCallback(async () => {
    if (!traceId) {
      showToast('Please enter a trace ID');
      return;
    }
    await TealiumHelper.joinTrace(traceId);
    showToast(`Joined trace: ${traceId}`);
  }, [traceId, showToast]);

  const handleLeaveTrace = useCallback(async () => {
    await TealiumHelper.leaveTrace();
    showToast('Left trace session');
  }, [showToast]);

  const handleForceEndOfVisit = useCallback(async () => {
    const result = await TealiumHelper.forceEndOfVisit();
    if (result) {
      showToast(`End of visit: ${result.status} — ${result.info} [${result.dispatch.id.slice(0, 8)}]`);
    } else {
      showToast('Forced end of visit (not initialized)');
    }
  }, [showToast]);

  return (
    <Section title="Trace">
      <TextInput
        style={styles.input}
        placeholder="Enter trace ID"
        placeholderTextColor="#666"
        value={traceId}
        onChangeText={setTraceId}
        autoCapitalize="none"
      />
      <Button title="Join Trace" onPress={handleJoinTrace} />
      <Button title="Leave Trace" onPress={handleLeaveTrace} />
      <Button
        title="Force End of Visit"
        onPress={handleForceEndOfVisit}
        color="#dc3545"
      />
    </Section>
  );
};
