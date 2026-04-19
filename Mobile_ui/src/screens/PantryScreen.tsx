import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ALL_UNITS,
  convertAmount,
  defaultStepForUnit,
  formatPantryQty,
  normalizeAmount,
  stepForProduct,
  unitsSameFamily,
  type PantryProduct,
  type PantryUnit,
} from '../data/pantrySeed';
import {
  createKitchenItem,
  deleteKitchenItem,
  fetchKitchenItems,
  getApiBaseUrl,
  revertLatestBill,
  saveScannedBillAndAddPantry,
  uploadReceiptForPreview,
  type ScanPreviewItem,
  updateKitchenItem,
  type KitchenItemDto,
} from '../services/api';
import { colors } from '../theme/colors';
import { radius, space } from '../theme/spacing';

type Props = {
  onBack: () => void;
  authToken: string;
};

function dtoToProduct(d: KitchenItemDto): PantryProduct {
  return {
    id: d.id,
    name: d.name,
    amount: d.amount,
    unit: d.unit as PantryUnit,
    ...(d.step != null ? { step: d.step } : {}),
    note: d.note || '',
  };
}

const UNIT_GROUPS: { label: string; units: PantryUnit[] }[] = [
  { label: 'Weight', units: ['g', 'kg', 'lb'] },
  { label: 'Volume', units: ['ml', 'L'] },
  { label: 'Count & packs', units: ['pcs', 'pack', 'bowl', 'tub', 'bag', 'container', 'loaf'] },
];

function parseAmountInput(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

export default function PantryScreen({ onBack, authToken }: Props) {
  const [products, setProducts] = useState<PantryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [addBillBusy, setAddBillBusy] = useState(false);
  const [billPreviewOpen, setBillPreviewOpen] = useState(false);
  const [billPreviewUri, setBillPreviewUri] = useState<string | null>(null);
  const [scanMerchant, setScanMerchant] = useState('Scanned receipt');
  const [scanBilledAt, setScanBilledAt] = useState('');
  const [scanLocationText, setScanLocationText] = useState('');
  const [scanSubtotal, setScanSubtotal] = useState('');
  const [scanTax, setScanTax] = useState('');
  const [scanTotal, setScanTotal] = useState('');
  const [scannedItems, setScannedItems] = useState<ScanPreviewItem[]>([]);
  const [scanEditIdx, setScanEditIdx] = useState<number | null>(null);
  const [scanEditName, setScanEditName] = useState('');
  const [scanEditQty, setScanEditQty] = useState('1');
  const [scanEditRate, setScanEditRate] = useState('');
  const [scanEditTax, setScanEditTax] = useState('');
  const [scanEditLineTotal, setScanEditLineTotal] = useState('');
  const [scanEditUnit, setScanEditUnit] = useState<PantryUnit>('pcs');
  const [scanBillEditOpen, setScanBillEditOpen] = useState(false);
  const scannedByCategory = useMemo(() => {
    const grouped: Record<string, Array<{ item: ScanPreviewItem; index: number }>> = {};
    for (const [index, item] of scannedItems.entries()) {
      const key = (item.category || 'Other').trim() || 'Other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ item, index });
    }
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  }, [scannedItems]);

  const [editing, setEditing] = useState<PantryProduct | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftAmountStr, setDraftAmountStr] = useState('');
  const [draftUnit, setDraftUnit] = useState<PantryUnit>('g');
  const [draftNote, setDraftNote] = useState('');
  const [draftCustomStep, setDraftCustomStep] = useState<string>('');

  const [newName, setNewName] = useState('');
  const [newAmountStr, setNewAmountStr] = useState('1');
  const [newUnit, setNewUnit] = useState<PantryUnit>('pcs');
  const [newNote, setNewNote] = useState('');

  const loadPantry = useCallback(
    async (opts?: { signal?: AbortSignal }) => {
      const signal = opts?.signal;
      setLoadError(null);
      try {
        const items = await fetchKitchenItems(authToken, signal);
        setProducts(items.map(dtoToProduct));
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setLoadError(e instanceof Error ? e.message : 'Could not load pantry');
      } finally {
        // Always clear spinners so navigation / StrictMode abort cannot leave the UI stuck loading.
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authToken],
  );

  useEffect(() => {
    const ac = new AbortController();
    let safety: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    safety = setTimeout(() => {
      setLoadError('Still loading — check Wi‑Fi, API on port 5051, or tap Retry.');
      setLoading(false);
      setRefreshing(false);
    }, 38_000);
    void loadPantry({ signal: ac.signal }).finally(() => {
      if (safety) clearTimeout(safety);
    });
    return () => {
      if (safety) clearTimeout(safety);
      ac.abort();
    };
  }, [authToken, loadPantry]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadPantry();
  }, [loadPantry]);

  const onRevertLastBill = useCallback(() => {
    Alert.alert(
      'Revert last bill?',
      'This will remove the latest added bill and reduce/remove pantry quantities from that bill. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revert',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const r = await revertLatestBill(authToken);
                await loadPantry();
                Alert.alert(
                  'Reverted',
                  `Bill reverted successfully.${r.adjusted_items != null ? ` Pantry items updated: ${r.adjusted_items}.` : ''}`
                );
              } catch (e) {
                Alert.alert('Revert failed', e instanceof Error ? e.message : 'Try again');
              }
            })();
          },
        },
      ]
    );
  }, [authToken, loadPantry]);

  useEffect(() => {
    if (!editing) return;
    setDraftName(editing.name);
    setDraftAmountStr(String(editing.amount));
    setDraftUnit(editing.unit);
    setDraftNote(editing.note);
    setDraftCustomStep(editing.step != null ? String(editing.step) : '');
  }, [editing]);

  const editStepSize = useMemo(() => {
    if (!editing) return defaultStepForUnit(draftUnit);
    const custom = parseAmountInput(draftCustomStep);
    if (custom != null && custom > 0) return custom;
    return stepForProduct({ unit: draftUnit, step: editing.step });
  }, [draftCustomStep, draftUnit, editing]);

  const resetAddForm = useCallback(() => {
    setNewName('');
    setNewAmountStr('1');
    setNewUnit('pcs');
    setNewNote('');
  }, []);

  const openAddProduct = useCallback(() => {
    resetAddForm();
    setAddOpen(true);
  }, [resetAddForm]);

  const openEdit = useCallback((p: PantryProduct) => {
    setEditing(p);
  }, []);

  const pickDraftUnit = useCallback(
    (next: PantryUnit) => {
      const parsed = parseAmountInput(draftAmountStr);
      const base = parsed ?? 0;
      if (unitsSameFamily(draftUnit, next)) {
        const converted = convertAmount(base, draftUnit, next);
        setDraftAmountStr(String(normalizeAmount(converted, next)));
      }
      setDraftUnit(next);
    },
    [draftAmountStr, draftUnit],
  );

  const bumpDraftAmount = useCallback(
    (dir: -1 | 1) => {
      const parsed = parseAmountInput(draftAmountStr) ?? 0;
      const step = editStepSize;
      const next = normalizeAmount(Math.max(0, parsed + dir * step), draftUnit);
      setDraftAmountStr(String(next));
    },
    [draftAmountStr, draftUnit, editStepSize],
  );

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    const name = draftName.trim();
    if (!name) return;
    const amt = parseAmountInput(draftAmountStr);
    if (amt == null) return;
    const finalAmount = normalizeAmount(amt, draftUnit);
    const stepTrim = draftCustomStep.trim();
    const parsedStep = parseAmountInput(draftCustomStep);
    const stepPayload =
      stepTrim === '' ? null : parsedStep != null && parsedStep > 0 ? parsedStep : null;
    try {
      const updated = await updateKitchenItem(authToken, editing.id, {
        name,
        amount: finalAmount,
        unit: draftUnit,
        note: draftNote.trim(),
        step: stepPayload,
      });
      setProducts((prev) => prev.map((p) => (p.id === editing.id ? dtoToProduct(updated) : p)));
      setEditing(null);
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Try again');
    }
  }, [
    authToken,
    draftAmountStr,
    draftCustomStep,
    draftName,
    draftNote,
    draftUnit,
    editing,
  ]);

  const deleteEditing = useCallback(async () => {
    if (!editing) return;
    Alert.alert('Remove item?', `Delete "${editing.name}" from pantry?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteKitchenItem(authToken, editing.id);
              setProducts((prev) => prev.filter((p) => p.id !== editing.id));
              setEditing(null);
            } catch (e) {
              Alert.alert('Remove failed', e instanceof Error ? e.message : 'Try again');
            }
          })();
        },
      },
    ]);
  }, [authToken, editing]);

  const saveNewProduct = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    const amt = parseAmountInput(newAmountStr);
    if (amt == null) return;
    const finalAmount = normalizeAmount(amt, newUnit);
    try {
      const created = await createKitchenItem(authToken, {
        name,
        amount: finalAmount,
        unit: newUnit,
        note: newNote.trim() || 'Added manually',
      });
      setProducts((prev) => [dtoToProduct(created), ...prev]);
      setAddOpen(false);
      resetAddForm();
    } catch (e) {
      Alert.alert('Add failed', e instanceof Error ? e.message : 'Try again');
    }
  }, [authToken, newAmountStr, newName, newNote, newUnit, resetAddForm]);

  const removeProduct = useCallback(
    async (id: string) => {
      const target = products.find((p) => p.id === id);
      Alert.alert('Remove item?', `Delete "${target?.name || 'this item'}" from pantry?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteKitchenItem(authToken, id);
                setProducts((prev) => prev.filter((p) => p.id !== id));
              } catch (e) {
                Alert.alert('Delete failed', e instanceof Error ? e.message : 'Try again');
              }
            })();
          },
        },
      ]);
    },
    [authToken, products],
  );

  const quickAdjustAmount = useCallback(
    async (item: PantryProduct, dir: -1 | 1) => {
      const step = stepForProduct(item);
      const nextAmount = normalizeAmount(Math.max(0, item.amount + dir * step), item.unit);
      if (nextAmount === item.amount) return;
      try {
        const updated = await updateKitchenItem(authToken, item.id, {
          amount: nextAmount,
        });
        setProducts((prev) => prev.map((p) => (p.id === item.id ? dtoToProduct(updated) : p)));
      } catch (e) {
        Alert.alert('Update failed', e instanceof Error ? e.message : 'Try again');
      }
    },
    [authToken],
  );

  const addScannedItemsToPantry = useCallback(async () => {
    if (addBillBusy) return;
    if (scannedItems.length === 0) {
      Alert.alert('No items', 'No scanned items were found in this receipt.');
      return;
    }
    try {
      setAddBillBusy(true);
      const subtotalNum = Number.parseFloat(scanSubtotal);
      const taxNum = Number.parseFloat(scanTax);
      const totalNum = Number.parseFloat(scanTotal);
      await saveScannedBillAndAddPantry(authToken, {
        merchant_name: scanMerchant.trim() || 'Scanned receipt',
        billed_at: scanBilledAt.trim() || null,
        location_text: scanLocationText.trim() || null,
        subtotal: Number.isFinite(subtotalNum) ? subtotalNum : null,
        tax_amount: Number.isFinite(taxNum) ? taxNum : null,
        total_amount: Number.isFinite(totalNum) ? totalNum : null,
        items: scannedItems.map((row) => ({
          raw_name: row.raw_name || 'Item',
          normalized_name: (row.normalized_name || row.raw_name || 'Item').trim(),
          category: row.category ?? null,
          quantity: Number(row.quantity ?? 1) > 0 ? Number(row.quantity ?? 1) : 1,
          unit: row.unit ?? 'pcs',
          unit_price: row.price ?? null,
          line_subtotal: row.line_subtotal ?? null,
          line_tax: row.line_tax ?? null,
          line_total: row.line_total ?? null,
        })),
      });
      await loadPantry();
      setBillPreviewOpen(false);
      setBillPreviewUri(null);
      setScannedItems([]);
    } catch (e) {
      Alert.alert('Could not add items', e instanceof Error ? e.message : 'Try again');
    } finally {
      setAddBillBusy(false);
    }
  }, [addBillBusy, authToken, loadPantry, scanBilledAt, scanLocationText, scanMerchant, scanSubtotal, scanTax, scanTotal, scannedItems]);

  const openScanEditor = useCallback(
    (index: number) => {
      const target = scannedItems[index];
      if (!target) return;
      setScanEditIdx(index);
      setScanEditName((target.normalized_name || target.raw_name || 'Item').trim());
      setScanEditQty(String(Number(target.quantity ?? 1) || 1));
      {
        const u = String(target.unit ?? 'pcs').trim() as PantryUnit;
        setScanEditUnit(ALL_UNITS.includes(u) ? u : 'pcs');
      }
      setScanEditRate(target.price != null ? String(target.price) : '');
      setScanEditTax(target.line_tax != null ? String(target.line_tax) : '');
      setScanEditLineTotal(target.line_total != null ? String(target.line_total) : '');
    },
    [scannedItems],
  );

  const saveScanEdit = useCallback(() => {
    if (scanEditIdx == null) return;
    const qty = Number.parseFloat(scanEditQty.trim());
    const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
    const name = scanEditName.trim() || 'Item';
    const unitRate = Number.parseFloat(scanEditRate.trim());
    const lineTax = Number.parseFloat(scanEditTax.trim());
    const lineTotalInput = Number.parseFloat(scanEditLineTotal.trim());
    const safeRate = Number.isFinite(unitRate) && unitRate >= 0 ? unitRate : 0;
    const computedSubtotal = Math.round(safeRate * safeQty * 100) / 100;
    const safeTax = Number.isFinite(lineTax) && lineTax >= 0 ? lineTax : 0;
    const safeLineTotal =
      Number.isFinite(lineTotalInput) && lineTotalInput >= 0
        ? lineTotalInput
        : Math.round((computedSubtotal + safeTax) * 100) / 100;
    setScannedItems((prev) =>
      prev.map((it, i) =>
        i === scanEditIdx
          ? {
              ...it,
              normalized_name: name,
              quantity: safeQty,
              unit: scanEditUnit,
              price: safeRate,
              line_subtotal: computedSubtotal,
              line_tax: safeTax,
              line_total: safeLineTotal,
            }
          : it,
      ),
    );
    setScanEditIdx(null);
  }, [scanEditIdx, scanEditLineTotal, scanEditName, scanEditQty, scanEditRate, scanEditTax, scanEditUnit]);

  const removeScannedItem = useCallback((index: number) => {
    setScannedItems((prev) => prev.filter((_, i) => i !== index));
    if (scanEditIdx === index) {
      setScanEditIdx(null);
    }
  }, [scanEditIdx]);

  const runPickCamera = useCallback(async (): Promise<string | null> => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Camera', 'Camera access is needed to photograph a receipt.');
      return null;
    }
    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
    });
    if (r.canceled || !r.assets?.[0]?.uri) return null;
    return r.assets[0].uri;
  }, []);

  const runPickLibrary = useCallback(async (): Promise<string | null> => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Photos', 'Photo library access is needed to choose a receipt image.');
      return null;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
    });
    if (r.canceled || !r.assets?.[0]?.uri) return null;
    return r.assets[0].uri;
  }, []);

  const finishScanWithUri = useCallback(async (uri: string | null) => {
    if (!uri) return;
    try {
      const preview = await uploadReceiptForPreview(authToken, uri);
      setScanMerchant(preview.merchant || 'Scanned receipt');
      setScanBilledAt(preview.date || '');
      setScanLocationText(preview.location_text || '');
      setScanSubtotal(preview.subtotal != null ? String(preview.subtotal) : '');
      setScanTax(preview.tax != null ? String(preview.tax) : '');
      setScanTotal(preview.total != null ? String(preview.total) : '');
      setScannedItems(preview.items || []);
      setBillPreviewUri(uri);
      setBillPreviewOpen(true);
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'Could not process this receipt right now.';
      // Same Alert for any failure; title distinguishes “your receipt failed OCR” vs “server not there / timeout / network”.
      const infra =
        /unreachable|timed out|timeout|502|504|HTTP 5\d\d|network request failed|failed to fetch|ECONNREFUSED|ENOTFOUND/i.test(
          detail,
        );
      Alert.alert(
        infra ? 'Receipt scan unavailable' : 'Scan failed',
        `${detail}\n\nKitchen API (receipt proxy): ${getApiBaseUrl().replace(/\/$/, '')}/api/scan/receipt-preview`,
      );
    }
  }, [authToken]);

  const onScanBill = useCallback(() => {
    if (scanBusy) return;
    if (Platform.OS === 'web') {
      void (async () => {
        setScanBusy(true);
        try {
          const uri = await runPickLibrary();
          await finishScanWithUri(uri);
        } finally {
          setScanBusy(false);
        }
      })();
      return;
    }

    Alert.alert(
      'Scan bill',
      'Add a photo of your receipt. We will send it to ScanAndSave (OpenRouter) and show detected items.',
      [
        {
          text: 'Take photo',
          onPress: () => {
            void (async () => {
              setScanBusy(true);
              try {
                const uri = await runPickCamera();
                await finishScanWithUri(uri);
              } finally {
                setScanBusy(false);
              }
            })();
          },
        },
        {
          text: 'Photo library',
          onPress: () => {
            void (async () => {
              setScanBusy(true);
              try {
                const uri = await runPickLibrary();
                await finishScanWithUri(uri);
              } finally {
                setScanBusy(false);
              }
            })();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [finishScanWithUri, runPickCamera, runPickLibrary, scanBusy]);

  const renderUnitChips = useCallback(
    (selected: PantryUnit, onSelect: (u: PantryUnit) => void) => (
      <View style={styles.unitGroups}>
        {UNIT_GROUPS.map((g) => (
          <View key={g.label} style={styles.unitGroup}>
            <Text style={styles.unitGroupLabel}>{g.label}</Text>
            <View style={styles.unitChipRow}>
              {g.units.map((u) => {
                const sel = selected === u;
                return (
                  <Pressable
                    key={u}
                    onPress={() => onSelect(u)}
                    style={({ pressed }) => [
                      styles.unitChip,
                      sel && styles.unitChipSelected,
                      pressed && !sel && styles.unitChipPressed,
                    ]}
                  >
                    <Text style={[styles.unitChipText, sel && styles.unitChipTextSelected]}>{u}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: PantryProduct }) => (
      <View style={styles.productRow}>
        <Pressable
          onPress={() => openEdit(item)}
          onLongPress={() => {
            void removeProduct(item.id);
          }}
          style={({ pressed }) => [styles.productTap, pressed && styles.productTapPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.name}, ${formatPantryQty(item.amount, item.unit)}`}
        >
          <View style={styles.productDot} />
          <View style={styles.productMain}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productQty}>{formatPantryQty(item.amount, item.unit)}</Text>
            <Text style={styles.productMeta} numberOfLines={1}>{item.note}</Text>
          </View>
          <View style={styles.rightActionsCol}>
            <Pressable
              onPress={() => {
                void quickAdjustAmount(item, 1);
              }}
              style={({ pressed }) => [styles.quickAdjustBtn, pressed && styles.quickAdjustBtnPressed]}
            >
              <Ionicons name="add" size={18} color={colors.sage} />
            </Pressable>
            <Pressable
              onPress={() => {
                void quickAdjustAmount(item, -1);
              }}
              style={({ pressed }) => [styles.quickAdjustBtn, pressed && styles.quickAdjustBtnPressed]}
            >
              <Ionicons name="remove" size={18} color={colors.sage} />
            </Pressable>
          </View>
        </Pressable>
      </View>
    ),
    [openEdit, quickAdjustAmount, removeProduct],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
        >
          <Ionicons name="chevron-back" size={28} color={colors.sage} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>My pantry</Text>
        </View>
        <Pressable onPress={onRevertLastBill} style={styles.revertBtn}>
          <Text style={styles.revertBtnText}>Revert last bill</Text>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={openAddProduct}
          style={({ pressed }) => [styles.actionSecondary, pressed && styles.actionSecondaryPressed]}
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.sage} />
          <Text style={styles.actionSecondaryText}>Add product</Text>
        </Pressable>
        <Pressable
          onPress={onScanBill}
          disabled={scanBusy}
          style={({ pressed }) => [
            styles.actionPrimary,
            (pressed || scanBusy) && styles.actionPrimaryPressed,
            scanBusy && styles.actionPrimaryDisabled,
          ]}
        >
          {scanBusy ? (
            <ActivityIndicator color={colors.canvas} />
          ) : (
            <>
              <Ionicons name="scan-outline" size={22} color={colors.canvas} />
              <Text style={styles.actionPrimaryText}>Scan bill</Text>
            </>
          )}
        </Pressable>
      </View>

      {loading && products.length === 0 && !loadError ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingHint}>Loading your pantry…</Text>
        </View>
      ) : null}

      {loadError && products.length === 0 && !loading ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Text style={styles.errorSub}>
            If the URL below is your Mac’s LAN IP, the kitchen API must be running on port 5051 and the phone must
            reach that host (same Wi‑Fi, or USB with `npm run start:localhost` and `npm run reverse:android`). Request
            URL: {getApiBaseUrl()}
            {'\n'}
            To use the hosted API instead, set EXPO_PUBLIC_API_URL to https://cook-as-u-go.onrender.com (see
            Mobile_ui/.env.example) or run `npm run start:render`, then restart Metro.
          </Text>
          <Pressable
            onPress={() => {
              setLoadError(null);
              setLoading(true);
              void loadPantry();
            }}
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {!(loading && products.length === 0 && !loadError) && !(loadError && products.length === 0 && !loading) ? (
        <>
          {loadError && products.length > 0 ? (
            <View style={styles.inlineError}>
              <Text style={styles.inlineErrorText}>{loadError}</Text>
              <Pressable onPress={onRefresh} hitSlop={8}>
                <Text style={styles.inlineErrorLink}>Refresh</Text>
              </Pressable>
            </View>
          ) : null}
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No items in the database for this account yet. Use Add product or Scan bill to
                create rows—they are saved on the server.
              </Text>
            }
          />
        </>
      ) : null}

      <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
        <View style={styles.addModalRoot}>
          <Pressable style={styles.addModalBackdrop} onPress={() => setAddOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.addKeyboard}
          >
            <ScrollView
              style={styles.addScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.addSheet}>
                <View style={styles.addGrab} />
                <Text style={styles.addTitle}>Add product</Text>
                <Text style={styles.addHint}>Set amount and unit (weight, volume, or count).</Text>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="e.g. Olive oil"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <Text style={styles.fieldLabel}>Unit</Text>
                {renderUnitChips(newUnit, setNewUnit)}
                <Text style={styles.fieldLabel}>Amount</Text>
                <View style={styles.qtyRow}>
                  <Pressable
                    onPress={() => {
                      const p = parseAmountInput(newAmountStr) ?? 0;
                      const step = defaultStepForUnit(newUnit);
                      setNewAmountStr(String(normalizeAmount(Math.max(0, p - step), newUnit)));
                    }}
                    style={({ pressed }) => [styles.qtyBtn, pressed && styles.qtyBtnPressed]}
                  >
                    <Ionicons name="remove" size={24} color={colors.sage} />
                  </Pressable>
                  <TextInput
                    value={newAmountStr}
                    onChangeText={setNewAmountStr}
                    keyboardType="decimal-pad"
                    style={styles.qtyInput}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Pressable
                    onPress={() => {
                      const p = parseAmountInput(newAmountStr) ?? 0;
                      const step = defaultStepForUnit(newUnit);
                      setNewAmountStr(String(normalizeAmount(p + step, newUnit)));
                    }}
                    style={({ pressed }) => [styles.qtyBtn, pressed && styles.qtyBtnPressed]}
                  >
                    <Ionicons name="add" size={24} color={colors.sage} />
                  </Pressable>
                </View>
                <Text style={styles.fieldLabel}>Note</Text>
                <TextInput
                  value={newNote}
                  onChangeText={setNewNote}
                  placeholder="e.g. Pantry shelf"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <Pressable onPress={saveNewProduct} style={styles.addSave}>
                  <Text style={styles.addSaveText}>Save product</Text>
                </Pressable>
                <Pressable onPress={() => setAddOpen(false)} style={styles.addCancel}>
                  <Text style={styles.addCancelText}>Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={editing !== null} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.addModalRoot}>
          <Pressable style={styles.addModalBackdrop} onPress={() => setEditing(null)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.addKeyboard}
          >
            <ScrollView
              style={styles.addScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.addSheet}>
                <View style={styles.addGrab} />
                <Text style={styles.addTitle}>Edit product</Text>
                <Text style={styles.editHint}>
                  − and + change the amount by {editStepSize}. Type any value in the field, or change unit below.
                </Text>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder="Product name"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <Text style={styles.fieldLabel}>Unit</Text>
                <Text style={styles.unitSwitchHint}>
                  Switching g↔kg or ml↔L converts the number. Other switches keep the same number.
                </Text>
                {renderUnitChips(draftUnit, pickDraftUnit)}
                <Text style={styles.fieldLabel}>Quantity</Text>
                <View style={styles.qtyRow}>
                  <Pressable
                    onPress={() => bumpDraftAmount(-1)}
                    style={({ pressed }) => [styles.qtyBtn, pressed && styles.qtyBtnPressed]}
                  >
                    <Ionicons name="remove" size={24} color={colors.sage} />
                  </Pressable>
                  <TextInput
                    value={draftAmountStr}
                    onChangeText={setDraftAmountStr}
                    keyboardType="decimal-pad"
                    style={styles.qtyInput}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Pressable
                    onPress={() => bumpDraftAmount(1)}
                    style={({ pressed }) => [styles.qtyBtn, pressed && styles.qtyBtnPressed]}
                  >
                    <Ionicons name="add" size={24} color={colors.sage} />
                  </Pressable>
                </View>
                <Text style={styles.fieldLabel}>Custom step (optional)</Text>
                <TextInput
                  value={draftCustomStep}
                  onChangeText={setDraftCustomStep}
                  keyboardType="decimal-pad"
                  placeholder={`Default ${defaultStepForUnit(draftUnit)} for ${draftUnit}`}
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <Text style={styles.fieldLabel}>Note</Text>
                <TextInput
                  value={draftNote}
                  onChangeText={setDraftNote}
                  placeholder="Where it lives, expiry…"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <Pressable onPress={saveEdit} style={styles.addSave}>
                  <Text style={styles.addSaveText}>Save changes</Text>
                </Pressable>
                <Pressable onPress={deleteEditing} style={styles.editDelete}>
                  <Text style={styles.editDeleteText}>Remove from pantry</Text>
                </Pressable>
                <Pressable onPress={() => setEditing(null)} style={styles.addCancel}>
                  <Text style={styles.addCancelText}>Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={billPreviewOpen}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setBillPreviewOpen(false);
          setBillPreviewUri(null);
          setScannedItems([]);
        }}
      >
        <View style={styles.billBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setBillPreviewOpen(false);
              setBillPreviewUri(null);
              setScannedItems([]);
            }}
          />
          <View style={styles.billCard}>
            <Text style={styles.billTitle}>Receipt preview</Text>
            <Text style={styles.billSub}>
              Parsed by ScanAndSave using OpenRouter. Review the items before adding to pantry.
            </Text>
            <Text style={styles.billMerchant}>{scanMerchant}</Text>
            <Pressable onPress={() => setScanBillEditOpen(true)} style={styles.billEditDetailsBtn}>
              <Text style={styles.billEditDetailsBtnText}>Bill Edit</Text>
            </Pressable>
            <Text style={styles.billCount}>{scannedItems.length} item(s) found</Text>
            {billPreviewUri ? (
              <Image source={{ uri: billPreviewUri }} style={styles.billThumb} resizeMode="cover" />
            ) : null}
            <ScrollView
              style={styles.billList}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {scannedByCategory.map(([category, rows]) => (
                <View key={category} style={styles.billCategoryBlock}>
                  <Text style={styles.billCategoryTitle}>{category}</Text>
                  {rows.map(({ item, index }, i) => (
                    <View key={`${category}-${item.raw_name}-${i}`} style={styles.billLine}>
                      <View style={styles.billLeftCol}>
                        <View style={styles.billNameRow}>
                          <Ionicons name="receipt-outline" size={18} color={colors.sage} />
                          <Text style={styles.billLineText}>
                            {(item.normalized_name || item.raw_name || 'Item').trim()}
                          </Text>
                        </View>
                        <Text style={styles.billLineSubText}>
                          {Number(item.quantity ?? 1) || 1} {item.unit || 'pcs'}
                          {item.price != null ? ` @ $${Number(item.price).toFixed(2)}` : ''} · line $
                          {Number(
                            item.line_total ??
                              item.line_subtotal ??
                              (Number(item.quantity ?? 1) || 1) * Number(item.price ?? 0),
                          ).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.billRightCol}>
                        <Pressable onPress={() => openScanEditor(index)} style={styles.billEditBtn}>
                          <Text style={styles.billEditBtnText}>Bill Edit</Text>
                        </Pressable>
                        <Pressable onPress={() => removeScannedItem(index)} style={styles.billRemoveBtn}>
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
              {scannedItems.length === 0 ? (
                <Text style={styles.billEmpty}>No items detected. Try a clearer receipt photo.</Text>
              ) : null}
            </ScrollView>
            <Pressable
              onPress={addScannedItemsToPantry}
              disabled={addBillBusy}
              style={({ pressed }) => [
                styles.billAddAll,
                (pressed || addBillBusy) && styles.billAddAllPressed,
                addBillBusy && styles.billAddAllDisabled,
              ]}
            >
              <Text style={styles.billAddAllText}>
                {addBillBusy ? 'Adding to pantry...' : 'Add all to pantry'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setBillPreviewOpen(false);
                setBillPreviewUri(null);
                setScannedItems([]);
              }}
              style={styles.billDismiss}
            >
              <Text style={styles.billDismissText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={scanEditIdx != null}
        animationType="slide"
        transparent
        onRequestClose={() => setScanEditIdx(null)}
      >
        <View style={styles.addModalRoot}>
          <Pressable style={styles.addModalBackdrop} onPress={() => setScanEditIdx(null)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.addKeyboard}
          >
            <View style={styles.addSheet}>
              <View style={styles.addGrab} />
              <Text style={styles.addTitle}>Edit scanned item</Text>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                value={scanEditName}
                onChangeText={setScanEditName}
                placeholder="Item name"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
              <Text style={styles.fieldLabel}>Quantity</Text>
              <TextInput
                value={scanEditQty}
                onChangeText={setScanEditQty}
                keyboardType="decimal-pad"
                placeholder="1"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
              <Text style={styles.fieldLabel}>Unit</Text>
              {renderUnitChips(scanEditUnit, setScanEditUnit)}
              <Text style={styles.fieldLabel}>Unit price (per kg, lb, or piece)</Text>
              <TextInput
                value={scanEditRate}
                onChangeText={setScanEditRate}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
              <Text style={styles.fieldLabel}>Tax amount (line)</Text>
              <TextInput
                value={scanEditTax}
                onChangeText={setScanEditTax}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
              <Text style={styles.fieldLabel}>Line total (optional override)</Text>
              <TextInput
                value={scanEditLineTotal}
                onChangeText={setScanEditLineTotal}
                keyboardType="decimal-pad"
                placeholder="Auto from qty + rate + tax"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
              <Pressable onPress={saveScanEdit} style={styles.addSave}>
                <Text style={styles.addSaveText}>Save item</Text>
              </Pressable>
              <Pressable onPress={() => setScanEditIdx(null)} style={styles.addCancel}>
                <Text style={styles.addCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={scanBillEditOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setScanBillEditOpen(false)}
      >
        <View style={styles.addModalRoot}>
          <Pressable style={styles.addModalBackdrop} onPress={() => setScanBillEditOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.addKeyboard}
          >
            <View style={styles.addSheet}>
              <View style={styles.addGrab} />
              <Text style={styles.addTitle}>Edit bill details</Text>
              <Text style={styles.fieldLabel}>Shop name</Text>
              <TextInput value={scanMerchant} onChangeText={setScanMerchant} style={styles.input} />
              <Text style={styles.fieldLabel}>Billed time/date (ISO or text)</Text>
              <TextInput value={scanBilledAt} onChangeText={setScanBilledAt} style={styles.input} />
              <Text style={styles.fieldLabel}>Location</Text>
              <TextInput value={scanLocationText} onChangeText={setScanLocationText} style={styles.input} />
              <Text style={styles.fieldLabel}>Subtotal</Text>
              <TextInput value={scanSubtotal} onChangeText={setScanSubtotal} keyboardType="decimal-pad" style={styles.input} />
              <Text style={styles.fieldLabel}>Tax amount</Text>
              <TextInput value={scanTax} onChangeText={setScanTax} keyboardType="decimal-pad" style={styles.input} />
              <Text style={styles.fieldLabel}>Total amount</Text>
              <TextInput value={scanTotal} onChangeText={setScanTotal} keyboardType="decimal-pad" style={styles.input} />
              <Pressable onPress={() => setScanBillEditOpen(false)} style={styles.addSave}>
                <Text style={styles.addSaveText}>Done</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    gap: space.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backBtnPressed: {
    backgroundColor: colors.surfaceInput,
  },
  headerTitles: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
  },
  headerSub: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  revertBtn: {
    borderWidth: 1,
    borderColor: colors.borderError,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.bannerErrorBg,
  },
  revertBtnText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
  actionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.sage,
    backgroundColor: colors.surfaceCard,
  },
  actionSecondaryPressed: {
    backgroundColor: colors.sageMuted,
  },
  actionSecondaryText: {
    color: colors.sage,
    fontWeight: '800',
    fontSize: 15,
  },
  actionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    minHeight: 52,
  },
  actionPrimaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  actionPrimaryDisabled: {
    opacity: 0.7,
  },
  actionPrimaryText: {
    color: colors.canvas,
    fontWeight: '800',
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xxl,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingVertical: space.md,
    paddingRight: space.xs,
    minWidth: 0,
  },
  productTapPressed: {
    backgroundColor: colors.sageMuted,
  },
  productDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  productMain: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  productQty: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  productMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
  productNoteRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  rightActionsCol: {
    flexDirection: 'row',
    gap: 10,
    marginLeft: 8,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  quickAdjustBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAdjustBtnPressed: {
    backgroundColor: colors.surfaceCard,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: space.xl,
    paddingHorizontal: space.lg,
    fontWeight: '500',
  },
  centerFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    gap: space.md,
  },
  loadingHint: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: space.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorSub: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryBtn: {
    marginTop: space.md,
    backgroundColor: colors.primary,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: radius.lg,
  },
  retryBtnText: {
    color: colors.canvas,
    fontWeight: '800',
    fontSize: 16,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    padding: space.md,
    backgroundColor: colors.bannerErrorBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bannerErrorBorder,
    gap: space.sm,
  },
  inlineErrorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  inlineErrorLink: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  addModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  addModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayScrim,
  },
  addKeyboard: {
    width: '100%',
    maxHeight: '92%',
  },
  addScroll: {
    maxHeight: '100%',
  },
  addSheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    paddingTop: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  addGrab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: space.md,
  },
  addTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  addHint: {
    marginTop: space.xs,
    marginBottom: space.lg,
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  editHint: {
    marginTop: space.xs,
    marginBottom: space.md,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: space.xs,
    marginTop: space.sm,
  },
  unitSwitchHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: space.sm,
    fontWeight: '500',
  },
  unitGroups: {
    marginBottom: space.sm,
  },
  unitGroup: {
    marginBottom: space.sm,
  },
  unitGroupLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.sage,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: space.xs,
  },
  unitChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  unitChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceInput,
  },
  unitChipPressed: {
    backgroundColor: colors.surfaceCard,
  },
  unitChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  unitChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  unitChipTextSelected: {
    color: colors.primaryPressed,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.md,
  },
  qtyBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.sageMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyBtnPressed: {
    backgroundColor: colors.surfaceInput,
  },
  qtyInput: {
    flex: 1,
    backgroundColor: colors.surfaceInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.surfaceInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: space.md,
  },
  addSave: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    alignItems: 'center',
    marginTop: space.sm,
  },
  addSaveText: {
    color: colors.canvas,
    fontWeight: '800',
    fontSize: 16,
  },
  editDelete: {
    marginTop: space.md,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderError,
    backgroundColor: colors.bannerErrorBg,
  },
  editDeleteText: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 16,
  },
  addCancel: {
    paddingVertical: space.md,
    alignItems: 'center',
  },
  addCancelText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 16,
  },
  billBackdrop: {
    flex: 1,
    backgroundColor: colors.overlayScrim,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  billCard: {
    backgroundColor: colors.canvas,
    borderRadius: radius.xl,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '85%',
  },
  billTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  billSub: {
    marginTop: space.sm,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  billMerchant: {
    marginTop: space.sm,
    color: colors.sage,
    fontSize: 14,
    fontWeight: '800',
  },
  billCount: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  billEditDetailsBtn: {
    marginTop: space.xs,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.surfaceInput,
  },
  billEditDetailsBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  billThumb: {
    width: '100%',
    height: 120,
    borderRadius: radius.md,
    marginTop: space.md,
    backgroundColor: colors.surfaceInput,
  },
  billList: {
    marginTop: space.md,
    maxHeight: 320,
  },
  billLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  billLeftCol: {
    flex: 1,
    minWidth: 0,
  },
  billRightCol: {
    width: 96,
    alignItems: 'flex-end',
    gap: 8,
  },
  billNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  billCategoryBlock: {
    marginBottom: space.sm,
  },
  billCategoryTitle: {
    color: colors.sage,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: space.sm,
    marginBottom: 4,
  },
  billLineText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  billLineSubText: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  billEditBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceInput,
  },
  billEditBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  billRemoveBtn: {
    borderWidth: 1,
    borderColor: colors.borderError,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.bannerErrorBg,
  },
  billEmpty: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: space.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
  billAddAll: {
    marginTop: space.lg,
    backgroundColor: colors.sage,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  billAddAllPressed: {
    opacity: 0.88,
  },
  billAddAllDisabled: {
    opacity: 0.65,
  },
  billAddAllText: {
    color: colors.canvas,
    fontWeight: '800',
    fontSize: 16,
  },
  billDismiss: {
    marginTop: space.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  billDismissText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 16,
  },
});
