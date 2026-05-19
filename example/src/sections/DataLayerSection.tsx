import React, { useState, useCallback, useRef } from 'react';
import { Text, TextInput } from 'react-native';
import Tealium, { type Disposable as TealiumDisposable } from 'tealium-prism-react-native';
import { Button, Section, styles } from '../components';
import TealiumHelper from '../TealiumHelper';

interface Props {
  showToast: (msg: string) => void;
}

export const DataLayerSection: React.FC<Props> = ({ showToast }) => {
  const [dataKey, setDataKey] = useState('example_key');
  const [dataValue, setDataValue] = useState('example_value');
  const [eventsEnabled, setEventsEnabled] = useState(false);
  const dataUpdateSub = useRef<TealiumDisposable | null>(null);
  const dataRemoveSub = useRef<TealiumDisposable | null>(null);

  const handleAddData = useCallback(() => {
    if (!dataKey || !dataValue) {
      showToast('Please enter both key and value');
      return;
    }
    TealiumHelper.addData({ [dataKey]: dataValue }, 'session');
    showToast(`Added: ${dataKey} = ${dataValue}`);
  }, [dataKey, dataValue, showToast]);

  const handleAddArrayData = useCallback(() => {
    TealiumHelper.addData(
      { example_tags: ['react-native', 'tealium', 'prism'] },
      'session'
    );
    showToast('Added: example_tags = [react-native, tealium, prism]');
  }, [showToast]);

  const handleGetData = useCallback(async () => {
    if (!dataKey) {
      showToast('Please enter a key');
      return;
    }
    const value = await TealiumHelper.getData(dataKey);
    const display =
      value == null
        ? 'null'
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);
    showToast(`${dataKey} = ${display}`);
  }, [dataKey, showToast]);

  const handleGetString = useCallback(async () => {
    if (!dataKey) { showToast('Please enter a key'); return; }
    const v = await Tealium.dataLayer.getString(dataKey);
    showToast(v != null ? `getString: "${v}"` : `getString: null`);
  }, [dataKey, showToast]);

  const handleGetInt = useCallback(async () => {
    if (!dataKey) { showToast('Please enter a key'); return; }
    const v = await Tealium.dataLayer.getInt(dataKey);
    showToast(v != null ? `getInt: ${v}` : `getInt: null`);
  }, [dataKey, showToast]);

  const handleGetBoolean = useCallback(async () => {
    if (!dataKey) { showToast('Please enter a key'); return; }
    const v = await Tealium.dataLayer.getBoolean(dataKey);
    showToast(v != null ? `getBoolean: ${v}` : `getBoolean: null`);
  }, [dataKey, showToast]);

  const handleAddWithTtl = useCallback(() => {
    if (!dataKey || !dataValue) { showToast('Please enter key and value'); return; }
    TealiumHelper.addData(
      { [dataKey]: dataValue },
      { after: new Date(Date.now() + 60_000) }
    );
    showToast(`Added: ${dataKey} = ${dataValue} (expires in 60s)`);
  }, [dataKey, dataValue, showToast]);

  const handleGetListData = useCallback(async () => {
    const list = await TealiumHelper.getListData('example_tags');
    showToast(
      list
        ? `example_tags = [${list.join(', ')}]`
        : 'example_tags not found (add array data first)'
    );
  }, [showToast]);

  const handleRemoveData = useCallback(() => {
    if (!dataKey) {
      showToast('Please enter a key');
      return;
    }
    TealiumHelper.removeData(dataKey);
    showToast(`Removed: ${dataKey}`);
  }, [dataKey, showToast]);

  const handleGetAllData = useCallback(async () => {
    const all = await TealiumHelper.getAllData();
    const keys = Object.keys(all);
    if (keys.length === 0) {
      showToast('Data layer is empty');
      return;
    }
    const preview = keys
      .map((k) => {
        const v = all[k];
        const display =
          v == null
            ? 'null'
            : typeof v === 'object'
              ? JSON.stringify(v)
              : String(v);
        return `${k}: ${display}`;
      })
      .join('\n');
    showToast(`Data layer (${keys.length} keys):\n${preview}`);
  }, [showToast]);

  const handleClearDataLayer = useCallback(async () => {
    await TealiumHelper.clearDataLayer();
    showToast('Data layer cleared');
  }, [showToast]);

  const handleToggleEvents = useCallback(() => {
    if (eventsEnabled) {
      dataUpdateSub.current?.dispose();
      dataRemoveSub.current?.dispose();
      dataUpdateSub.current = null;
      dataRemoveSub.current = null;
      setEventsEnabled(false);
      showToast('DataLayer events disabled');
    } else {
      dataUpdateSub.current = TealiumHelper.onDataUpdated((data) => {
        showToast(`DataLayer updated: ${Object.keys(data).join(', ')}`);
      });
      dataRemoveSub.current = TealiumHelper.onDataRemoved((keys) => {
        showToast(`DataLayer keys removed: ${keys.join(', ')}`);
      });
      setEventsEnabled(true);
      showToast('DataLayer events enabled');
    }
  }, [eventsEnabled, showToast]);

  return (
    <>
      <Section title="Data Layer Observable">
        <Button
          title={eventsEnabled ? 'Disable Events' : 'Enable Events'}
          onPress={handleToggleEvents}
          color={eventsEnabled ? '#dc3545' : '#28a745'}
        />
        <Text style={styles.helperText}>
          When enabled, adding/removing data will show a toast.
        </Text>
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
        <Button title="Add Data (session)" onPress={handleAddData} />
        <Button title="Add Data (TTL 60s)" onPress={handleAddWithTtl} />
        <Button title="Add Array Data" onPress={handleAddArrayData} />
        <Button title="Get Data (DataItem)" onPress={handleGetData} />
        <Button title="Get String" onPress={handleGetString} />
        <Button title="Get Int" onPress={handleGetInt} />
        <Button title="Get Boolean" onPress={handleGetBoolean} />
        <Button title="Get List Data" onPress={handleGetListData} />
        <Button title="Remove Data" onPress={handleRemoveData} />
        <Button title="Get All Data" onPress={handleGetAllData} />
        <Button
          title="Clear Data Layer"
          onPress={handleClearDataLayer}
          color="#dc3545"
        />
      </Section>
    </>
  );
};
