import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  createUserApiSetting,
  deleteUserApiSetting,
  listUserApiSettings,
  setDefaultUserApiSetting,
  type ApiSetting,
} from '../services/api';
import { colors } from '../theme/colors';
import { radius, space } from '../theme/spacing';

type Props = {
  authToken: string;
  onBack: () => void;
};

export default function ApiSettingsScreen({ authToken, onBack }: Props) {
  const [items, setItems] = useState<ApiSetting[]>([]);
  const [provider, setProvider] = useState('custom');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const next = await listUserApiSettings(authToken);
    setItems(next);
  }, [authToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => Number(b.is_default) - Number(a.is_default)),
    [items]
  );

  const onAdd = async () => {
    if (busy) return;
    if (!apiKey.trim()) {
      Alert.alert('Missing fields', 'Please enter your API key.');
      return;
    }
    const providerDefaults: Record<string, string> = {
      openrouter: 'https://openrouter.ai/api/v1',
      gemini: 'https://generativelanguage.googleapis.com/v1beta',
      openai: 'https://api.openai.com/v1',
      claude: 'https://api.anthropic.com/v1',
      custom: 'https://openrouter.ai/api/v1',
    };
    const resolvedBaseUrl = providerDefaults[provider] || providerDefaults.custom;
    try {
      setBusy(true);
      await createUserApiSetting(authToken, {
        api_type: 'global',
        provider: provider.trim() || 'custom',
        model: provider === 'custom' ? model.trim() || undefined : undefined,
        base_url: resolvedBaseUrl,
        api_key: apiKey.trim(),
      });
      setModel('');
      setApiKey('');
      await reload();
    } catch (e) {
      Alert.alert('Could not save API', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const onSetDefault = async (item: ApiSetting) => {
    try {
      await setDefaultUserApiSetting(authToken, item.id, 'global');
      await reload();
    } catch (e) {
      Alert.alert('Could not set default', e instanceof Error ? e.message : 'Try again');
    }
  };

  const onDelete = async (item: ApiSetting) => {
    try {
      await deleteUserApiSetting(authToken, item.id);
      await reload();
    } catch (e) {
      Alert.alert('Could not delete API', e instanceof Error ? e.message : 'Try again');
    }
  };

  const section = (title: string, list: ApiSetting[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {list.length === 0 ? (
        <Text style={styles.empty}>No APIs added.</Text>
      ) : (
        list.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {item.label || item.provider || 'API'}
              </Text>
              <Text style={styles.rowMeta}>
                {(item.provider || 'custom') + (item.model ? ` · ${item.model}` : '')}
              </Text>
              <Text style={styles.rowSub}>{item.base_url}</Text>
            </View>
            <Pressable onPress={() => void onSetDefault(item)} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>{item.is_default ? 'Default' : 'Make default'}</Text>
            </Pressable>
            <Pressable onPress={() => void onDelete(item)} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          </View>
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.sage} />
        </Pressable>
        <Text style={styles.title}>API settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.help}>API key is required. Choose provider, save, then set one default.</Text>
        <View style={styles.typeRow}>
          {['openrouter', 'gemini', 'openai', 'claude', 'custom'].map((p) => (
            <Pressable key={p} onPress={() => setProvider(p)} style={[styles.typeChip, provider === p && styles.typeChipActive]}>
              <Text style={[styles.typeChipText, provider === p && styles.typeChipTextActive]}>{p}</Text>
            </Pressable>
          ))}
        </View>
        {provider === 'custom' ? (
          <TextInput
            value={model}
            onChangeText={setModel}
            placeholder="Model (shown only for custom)"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="none"
          />
        ) : null}
        <TextInput
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="API key (required)"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
        />
        <Pressable onPress={() => void onAdd()} style={styles.addBtn}>
          <Text style={styles.addBtnText}>{busy ? 'Saving...' : 'Add API'}</Text>
        </Pressable>

        {section('API endpoints', sortedItems)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  content: { padding: space.lg, paddingBottom: space.xxl },
  help: { color: colors.textSecondary, marginBottom: space.md },
  input: {
    backgroundColor: colors.surfaceInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: space.sm,
  },
  typeRow: { flexDirection: 'row', gap: space.sm, marginBottom: space.sm },
  typeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceCard,
  },
  typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  typeChipText: { color: colors.textSecondary, fontWeight: '700' },
  typeChipTextActive: { color: colors.primaryPressed },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    alignItems: 'center',
    marginBottom: space.lg,
  },
  addBtnText: { color: colors.canvas, fontWeight: '800', fontSize: 16 },
  section: { marginTop: space.md },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.sage, textTransform: 'uppercase', marginBottom: space.sm },
  empty: { color: colors.textMuted, marginBottom: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.sm,
    marginBottom: space.sm,
  },
  rowTitle: { color: colors.text, fontWeight: '700' },
  rowMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  smallBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.surfaceInput,
  },
  smallBtnText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  iconBtn: {
    borderWidth: 1,
    borderColor: colors.borderError,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.bannerErrorBg,
  },
});
