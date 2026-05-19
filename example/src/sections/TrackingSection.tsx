import React, { useCallback } from 'react';
import Tealium, { TealiumView, TealiumEvent } from 'tealium-prism-react-native';
import { Button, Section } from '../components';
import TealiumHelper from '../TealiumHelper';

interface Props {
  showToast: (msg: string) => void;
}

export const TrackingSection: React.FC<Props> = ({ showToast }) => {
  const handleTrackView = useCallback(async () => {
    const view = new TealiumView('screen_view', { section: 'demo' });
    const result = await Tealium.track(view.name, view.type, view.data);
    showToast(`View tracked: ${result.status} [${result.dispatch.id.slice(0, 8)}]`);
  }, [showToast]);

  const handleTrackEvent = useCallback(async () => {
    const event = new TealiumEvent('button_tapped', {
      event_category: 'example',
      event_action: 'tap',
      event_label: 'Track Event',
    });
    const result = await Tealium.track(event.name, event.type, event.data);
    showToast(`Event tracked: ${result.status} [${result.dispatch.id.slice(0, 8)}]`);
  }, [showToast]);

  const handleFlush = useCallback(async () => {
    await TealiumHelper.flush();
    showToast('Event queue flushed');
  }, [showToast]);

  return (
    <Section title="Tracking">
      <Button title="Track View" onPress={handleTrackView} />
      <Button title="Track Event" onPress={handleTrackEvent} />
      <Button title="Flush Event Queue" onPress={handleFlush} />
    </Section>
  );
};
