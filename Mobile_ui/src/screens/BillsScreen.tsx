import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { deleteBill, fetchBillDetail, fetchBills, type BillDetail, type BillListItem, updateBill } from '../services/api';
import { colors } from '../theme/colors';
import { radius, space } from '../theme/spacing';

type Props = {
  authToken: string;
  onBack: () => void;
  onOpenReport: () => void;
};

function asMoney(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

export default function BillsScreen({ authToken, onBack, onOpenReport }: Props) {
  const [items, setItems] = useState<BillListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<BillDetail | null>(null);
  const [billBusy, setBillBusy] = useState(false);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [showFilterDatePicker, setShowFilterDatePicker] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editMerchant, setEditMerchant] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSubtotal, setEditSubtotal] = useState('');
  const [editTax, setEditTax] = useState('');
  const [editTotal, setEditTotal] = useState('');
  const [editDateObj, setEditDateObj] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const openNativeDateTimePicker = useCallback(() => {
    if (Platform.OS !== 'android') {
      setShowDatePicker(true);
      return;
    }
    DateTimePickerAndroid.open({
      value: editDateObj,
      mode: 'date',
      is24Hour: false,
      onChange: (_dateEvent, pickedDate) => {
        if (!pickedDate) return;
        DateTimePickerAndroid.open({
          value: pickedDate,
          mode: 'time',
          is24Hour: false,
          onChange: (_timeEvent, pickedTime) => {
            if (!pickedTime) return;
            const merged = new Date(pickedDate);
            merged.setHours(pickedTime.getHours(), pickedTime.getMinutes(), 0, 0);
            setEditDateObj(merged);
            setEditDate(merged.toISOString());
          },
        });
      },
    });
  }, [editDateObj]);

  const openFilterDatePicker = useCallback(() => {
    if (Platform.OS !== 'android') {
      setShowFilterDatePicker(true);
      return;
    }
    DateTimePickerAndroid.open({
      value: filterDate || new Date(),
      mode: 'date',
      is24Hour: false,
      onChange: (_event, selected) => {
        if (!selected) return;
        setFilterDate(selected);
      },
    });
  }, [filterDate]);


  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchBills(authToken);
      setItems(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bills');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authToken]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const filteredBills = useMemo(() => {
    return items.filter((b) => {
      const d = b.billed_at ? new Date(String(b.billed_at)) : null;
      if (!d || Number.isNaN(d.getTime())) {
        return filterDate == null && filterMonth == null && filterYear == null;
      }
      if (filterYear != null && d.getFullYear() !== filterYear) return false;
      if (filterMonth != null && d.getMonth() + 1 !== filterMonth) return false;
      if (filterDate != null) {
        const same =
          d.getFullYear() === filterDate.getFullYear() &&
          d.getMonth() === filterDate.getMonth() &&
          d.getDate() === filterDate.getDate();
        if (!same) return false;
      }
      return true;
    });
  }, [filterDate, filterMonth, filterYear, items]);

  const sections = useMemo(() => {
    const grouped: Record<string, BillListItem[]> = {};
    for (const b of filteredBills) {
      const key = b.billed_at ? new Date(String(b.billed_at)).toLocaleDateString() : 'Unknown date';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(b);
    }
    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [filteredBills]);

  const openBill = useCallback(async (id: string) => {
    try {
      setBillBusy(true);
      const bill = await fetchBillDetail(authToken, id);
      setSelectedBill(bill);
    } finally {
      setBillBusy(false);
    }
  }, [authToken]);

  const openEditBill = useCallback(() => {
    if (!selectedBill) return;
    setEditMerchant(selectedBill.merchant_name || '');
    const parsed = selectedBill.billed_at ? new Date(String(selectedBill.billed_at)) : new Date();
    const safe = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    setEditDateObj(safe);
    setEditDate(safe.toISOString());
    setEditLocation(selectedBill.location_text ? String(selectedBill.location_text) : '');
    setEditSubtotal(String(Number(selectedBill.subtotal ?? 0)));
    setEditTax(String(Number(selectedBill.tax_amount ?? 0)));
    setEditTotal(String(Number(selectedBill.total_amount ?? 0)));
    setEditOpen(true);
  }, [selectedBill]);

  const saveEditBill = useCallback(async () => {
    if (!selectedBill) return;
    try {
      const payload = {
        merchant_name: editMerchant.trim() || selectedBill.merchant_name,
        billed_at: editDate.trim() || new Date().toISOString(),
        location_text: editLocation.trim(),
        subtotal: Number.parseFloat(editSubtotal) || 0,
        tax_amount: Number.parseFloat(editTax) || 0,
        total_amount: Number.parseFloat(editTotal) || 0,
      };
      const updated = await updateBill(authToken, selectedBill.id, payload);
      setSelectedBill((prev) => (prev ? { ...prev, ...updated } : prev));
      setItems((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
      setEditOpen(false);
    } catch (e) {
      Alert.alert('Update failed', e instanceof Error ? e.message : 'Try again');
    }
  }, [authToken, editDate, editLocation, editMerchant, editSubtotal, editTax, editTotal, selectedBill]);

  const confirmDeleteBill = useCallback((bill: BillListItem) => {
    Alert.alert(
      'Delete bill?',
      `Delete "${bill.merchant_name}" permanently?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteBill(authToken, bill.id);
                setItems((prev) => prev.filter((x) => x.id !== bill.id));
                if (selectedBill?.id === bill.id) setSelectedBill(null);
              } catch (e) {
                Alert.alert('Delete failed', e instanceof Error ? e.message : 'Try again');
              }
            })();
          },
        },
      ]
    );
  }, [authToken, selectedBill?.id]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.sage} />
        </Pressable>
        <Text style={styles.title}>View Bills</Text>
        <Pressable onPress={onOpenReport} style={styles.reportBtn}>
          <Text style={styles.reportBtnText}>View Report</Text>
        </Pressable>
      </View>
      <View style={styles.filtersWrap}>
        <Pressable onPress={openFilterDatePicker} style={styles.filterChip}>
          <Text style={styles.filterChipText}>
            {filterDate ? filterDate.toLocaleDateString() : 'Date'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilterMonth((m) => (m == null ? new Date().getMonth() + 1 : null))}
          style={styles.filterChip}
        >
          <Text style={styles.filterChipText}>
            {filterMonth != null ? `Month ${filterMonth}` : 'Month'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilterYear((y) => (y == null ? new Date().getFullYear() : null))}
          style={styles.filterChip}
        >
          <Text style={styles.filterChipText}>
            {filterYear != null ? `Year ${filterYear}` : 'Year'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setFilterDate(null);
            setFilterMonth(null);
            setFilterYear(null);
          }}
          style={styles.clearFilterChip}
        >
          <Text style={styles.clearFilterChipText}>Clear</Text>
        </Pressable>
      </View>
      {showFilterDatePicker && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={filterDate || new Date()}
          mode="date"
          display="spinner"
          onChange={(_event, selected) => {
            if (!selected) return;
            setFilterDate(selected);
          }}
        />
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(x) => x.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionDate}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.merchant_name}</Text>
              <Text style={styles.meta}>
                {item.billed_at ? new Date(item.billed_at).toLocaleString() : 'Unknown date'}
              </Text>
              <Text style={styles.meta}>Total: ${asMoney(item.total_amount)} · Items: {item.item_count ?? 0}</Text>
              <View style={styles.actions}>
                <Pressable onPress={() => void openBill(item.id)} style={styles.viewBillBtn}>
                  <Text style={styles.viewBillBtnText}>View Bill</Text>
                </Pressable>
                <Pressable onPress={() => confirmDeleteBill(item)} style={styles.deleteBillBtn}>
                  <Text style={styles.deleteBillBtnText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{error || 'No bills found for selected filters.'}</Text>}
        />
      )}

      <Modal visible={selectedBill !== null} transparent animationType="slide" onRequestClose={() => setSelectedBill(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {billBusy || !selectedBill ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedBill.merchant_name}</Text>
                  <Pressable onPress={() => setSelectedBill(null)}>
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </Pressable>
                </View>
                <View style={styles.editBillRow}>
                  <Pressable onPress={openEditBill}>
                    <Text style={styles.inlineEditBtn}>Edit Bill</Text>
                  </Pressable>
                </View>
                <Text style={styles.meta}>
                  {selectedBill.billed_at ? new Date(selectedBill.billed_at).toLocaleString() : 'Unknown date'}
                </Text>
                <Text style={styles.meta}>
                  Subtotal ${asMoney(selectedBill.subtotal)} · Tax ${asMoney(selectedBill.tax_amount)} · Total ${asMoney(selectedBill.total_amount)}
                </Text>
                <ScrollView style={{ marginTop: space.sm }}>
                  {(selectedBill.items || []).map((it) => (
                    <View key={it.id} style={styles.lineRow}>
                      <Text style={styles.lineName}>{it.normalized_name || it.raw_name}</Text>
                      <Text style={styles.lineMeta}>
                        {Number(it.quantity ?? 1)} {it.unit || 'pcs'} · ${asMoney(it.unit_price)} + tax ${asMoney(it.line_tax)} = ${asMoney(it.line_total)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.reportCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Bill</Text>
              <Pressable onPress={() => setEditOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <TextInput value={editMerchant} onChangeText={setEditMerchant} placeholder="Merchant" style={styles.input} />
            <Pressable onPress={openNativeDateTimePicker} style={styles.input}>
              <Text style={styles.dateText}>{editDateObj.toLocaleString()}</Text>
            </Pressable>
            {showDatePicker && Platform.OS === 'ios' ? (
              <DateTimePicker
                value={editDateObj}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_event, selected) => {
                  if (!selected) return;
                  setEditDateObj(selected);
                  setEditDate(selected.toISOString());
                }}
              />
            ) : null}
            <TextInput value={editLocation} onChangeText={setEditLocation} placeholder="Location" style={styles.input} />
            <TextInput value={editSubtotal} onChangeText={setEditSubtotal} placeholder="Subtotal" keyboardType="decimal-pad" style={styles.input} />
            <TextInput value={editTax} onChangeText={setEditTax} placeholder="Tax amount" keyboardType="decimal-pad" style={styles.input} />
            <TextInput value={editTotal} onChangeText={setEditTotal} placeholder="Total amount" keyboardType="decimal-pad" style={styles.input} />
            <Pressable onPress={() => void saveEditBill()} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save bill changes</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  reportBtn: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceCard,
  },
  reportBtnText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  filtersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceCard,
  },
  filterChipText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  clearFilterChip: {
    borderWidth: 1,
    borderColor: colors.borderError,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.bannerErrorBg,
  },
  clearFilterChipText: { color: colors.danger, fontWeight: '700', fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.sm },
  sectionDate: {
    marginTop: space.sm,
    marginBottom: 6,
    color: colors.sage,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surfaceCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: space.md,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  meta: { marginTop: 4, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  actions: { marginTop: space.sm, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  viewBillBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceInput,
  },
  viewBillBtnText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  deleteBillBtn: {
    borderWidth: 1,
    borderColor: colors.borderError,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.bannerErrorBg,
  },
  deleteBillBtnText: { color: colors.danger, fontWeight: '700', fontSize: 12 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: space.xl, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlayScrim,
    justifyContent: 'center',
    padding: space.lg,
  },
  modalCard: {
    maxHeight: '80%',
    backgroundColor: colors.canvas,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  reportCard: {
    backgroundColor: colors.canvas,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  lineRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  lineName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  lineMeta: { marginTop: 3, color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  editBillRow: {
    marginTop: 6,
    alignItems: 'flex-end',
  },
  inlineEditBtn: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surfaceInput,
  },
  input: {
    marginTop: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceInput,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontWeight: '600',
  },
  saveBtn: {
    marginTop: space.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  saveBtnText: { color: colors.canvas, fontWeight: '800', fontSize: 15 },
  dateText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
});
