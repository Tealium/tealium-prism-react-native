import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createLifecycleAPI } from 'tealium-prism-lifecycle-react-native';

interface Props {
  showToast: (msg: string) => void;
}

export function LifecycleSection({ showToast }: Props) {
  const [lastAction, setLastAction] = useState<string | null>(null);

  const run = async (action: 'launch' | 'wake' | 'sleep') => {
    try {
      const lifecycle = createLifecycleAPI();
      await lifecycle[action]();
      const msg = `lifecycle.${action}() sent`;
      setLastAction(msg);
      showToast(msg);
    } catch (e) {
      showToast(`Error: ${String(e)}`);
    }
  };

  const runWithData = async () => {
    try {
      const lifecycle = createLifecycleAPI();
      await lifecycle.launch({ custom_key: 'custom_value', session: 'demo' });
      const msg = 'lifecycle.launch({ custom_key, session }) sent';
      setLastAction(msg);
      showToast(msg);
    } catch (e) {
      showToast(`Error: ${String(e)}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lifecycle</Text>
      <Text style={styles.subtitle}>autoTracking: false — manual calls required</Text>

      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={() => run('launch')}>
          <Text style={styles.buttonText}>Launch</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => run('wake')}>
          <Text style={styles.buttonText}>Wake</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => run('sleep')}>
          <Text style={styles.buttonText}>Sleep</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.button, styles.buttonWide]} onPress={runWithData}>
        <Text style={styles.buttonText}>Launch with data</Text>
      </TouchableOpacity>

      {lastAction && <Text style={styles.result}>{lastAction}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8, padding: 12, backgroundColor: '#f8f8f8', borderRadius: 8 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#666', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  button: { backgroundColor: '#0066cc', padding: 10, borderRadius: 6, flex: 1, alignItems: 'center' },
  buttonWide: { flex: 0, paddingHorizontal: 16 },
  buttonText: { color: '#fff', fontWeight: '500' },
  result: { marginTop: 8, fontSize: 12, color: '#333', fontStyle: 'italic' },
});
