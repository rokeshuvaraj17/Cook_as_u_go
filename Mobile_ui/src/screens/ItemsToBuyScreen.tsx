import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchKitchenItems, type KitchenItemDto } from '../services/api';
import { colors } from '../theme/colors';
import { radius, space } from '../theme/spacing';

type Props = {
  authToken: string;
  onBack: () => void;
};

type BuyRow = {
  id: string;
  name: string;
  unit: string;
  current: number;
  threshold: number;
  suggestedBuy: number;
  reason: string;
};

function lowStockThreshold(unit: string): number {
  if (unit === 'g') return 250;
  if (unit === 'kg') return 0.5;
  if (unit === 'ml') return 400;
  if (unit === 'L') return 1;
  if (unit === 'pcs') return 3;
  return 2;
}

function targetStock(unit: string): number {
  if (unit === 'g') return 800;
  if (unit === 'kg') return 1.5;
  if (unit === 'ml') return 1200;
  if (unit === 'L') return 2;
  if (unit === 'pcs') return 8;
  return 4;
}

function toBuyRows(items: KitchenItemDto[]): BuyRow[] {
  return items
    .map((it) => {
      const current = Number(it.amount || 0);
      const threshold = lowStockThreshold(it.unit);
      if (current > threshold) return null;
      const target = targetStock(it.unit);
      return {
        id: it.id,
        name: it.name || 'Item',
        unit: it.unit || 'pcs',
        current,
        threshold,
        suggestedBuy: Math.max(0, target - current),
        reason: current === 0 ? 'Out of stock' : 'Low stock',
      } as BuyRow;
    })
    .filter((x): x is BuyRow => x != null)
    .sort((a, b) => a.current - b.current);
}

export default function ItemsToBuyScreen({ authToken, onBack }: Props) {
  const [items, setItems] = useState<KitchenItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchKitchenItems(authToken);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pantry');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authToken]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const buyRows = useMemo(() => toBuyRows(items), [items]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.sage} />
        </Pressable>
        <Text style={styles.title}>Items to Buy</Text>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={buyRows}
          keyExtractor={(x) => x.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                Current: {item.current} {item.unit} · Threshold: {item.threshold} {item.unit}
              </Text>
              <Text style={styles.buyHint}>
                {item.reason}: Buy about {item.suggestedBuy.toFixed(2)} {item.unit}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {error || 'No low-stock items right now. Pantry levels look good.'}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceCard, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.sm },
  card: {
    backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.md,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  meta: { marginTop: 4, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  buyHint: { marginTop: 6, color: colors.primaryPressed, fontSize: 13, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: space.xl, color: colors.textMuted, fontWeight: '600' },
});
