import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchBillsReport, fetchKitchenItems, type BillsReport, type KitchenItemDto } from '../services/api';
import { colors } from '../theme/colors';
import { radius, space } from '../theme/spacing';
import Svg, { Circle } from 'react-native-svg';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

type Props = { authToken: string; onBack: () => void };

function money(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

export default function ReportsScreen({ authToken, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<BillsReport | null>(null);
  const [merchantReport, setMerchantReport] = useState<BillsReport | null>(null);
  const [merchantFromDate, setMerchantFromDate] = useState('');
  const [merchantToDate, setMerchantToDate] = useState('');
  const [merchantMonth, setMerchantMonth] = useState('');
  const [merchantYear, setMerchantYear] = useState('');
  const [fromDateObj, setFromDateObj] = useState<Date | null>(null);
  const [toDateObj, setToDateObj] = useState<Date | null>(null);
  const [showFromDatePickerIOS, setShowFromDatePickerIOS] = useState(false);
  const [showToDatePickerIOS, setShowToDatePickerIOS] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState('');
  const [merchantPickerOpen, setMerchantPickerOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productDetailOpen, setProductDetailOpen] = useState(false);
  const [productDetailName, setProductDetailName] = useState('');
  const [checkedProduct, setCheckedProduct] = useState('');
  const [productReport, setProductReport] = useState<BillsReport | null>(null);
  const [pantryItems, setPantryItems] = useState<KitchenItemDto[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, items] = await Promise.all([
        fetchBillsReport(authToken),
        fetchKitchenItems(authToken).catch(() => [] as KitchenItemDto[]),
      ]);
      setReport(data);
      setPantryItems(items);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  const toYmd = useCallback((d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const openFromDatePicker = useCallback(() => {
    if (Platform.OS !== 'android') {
      setShowFromDatePickerIOS(true);
      return;
    }
    DateTimePickerAndroid.open({
      value: fromDateObj || new Date(),
      mode: 'date',
      onChange: (_e, d) => {
        if (!d) return;
        setFromDateObj(d);
        setMerchantFromDate(toYmd(d));
      },
    });
  }, [fromDateObj, toYmd]);

  const openToDatePicker = useCallback(() => {
    if (Platform.OS !== 'android') {
      setShowToDatePickerIOS(true);
      return;
    }
    DateTimePickerAndroid.open({
      value: toDateObj || new Date(),
      mode: 'date',
      onChange: (_e, d) => {
        if (!d) return;
        setToDateObj(d);
        setMerchantToDate(toYmd(d));
      },
    });
  }, [toDateObj, toYmd]);

  useEffect(() => {
    void load();
  }, [load]);

  const runProductQuery = useCallback(async (productName: string) => {
    const p = productName.trim();
    if (!p) return;
    setCheckedProduct(p);
    const data = await fetchBillsReport(authToken, {
      product: p,
    });
    setProductReport(data);
  }, [authToken]);

  const checkProductInsights = useCallback(async () => {
    await runProductQuery(selectedProduct);
  }, [runProductQuery, selectedProduct]);

  const loadMerchantFiltered = useCallback(async () => {
    const data = await fetchBillsReport(authToken, {
      fromDate: merchantFromDate.trim() || undefined,
      toDate: merchantToDate.trim() || undefined,
      month: merchantMonth.trim() || undefined,
      year: merchantYear.trim() || undefined,
    });
    setMerchantReport(data);
    setSelectedMerchant('');
  }, [authToken, merchantFromDate, merchantMonth, merchantToDate, merchantYear]);

  const activeMerchantReport = merchantReport || report;
  const maxMerchantSpend = useMemo(() => {
    const arr = activeMerchantReport?.merchant_spend || [];
    return arr.length ? Math.max(...arr.map((x) => Number(x.spend || 0))) : 1;
  }, [activeMerchantReport]);

  const pieData = useMemo(() => (activeMerchantReport?.merchant_spend || []).slice(0, 5), [activeMerchantReport]);
  const pieColors = ['#147A5C', '#E2562E', '#C9932E', '#2E7DA8', '#8B5BB0'];
  const merchantOptions = useMemo(() => (activeMerchantReport?.merchant_spend || []).map((m) => String(m.merchant_name)), [activeMerchantReport]);
  const productOptions = useMemo(() => {
    const names = new Set<string>();
    for (const i of pantryItems) {
      const n = String(i.name ?? '').trim();
      if (n) names.add(n);
    }
    for (const p of report?.top_products_by_qty || []) {
      const n = String(p.product ?? '').trim();
      if (n) names.add(n);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [pantryItems, report]);
  const selectedMerchantSpend = useMemo(() => {
    const hit = (activeMerchantReport?.merchant_spend || []).find((m) => String(m.merchant_name) === selectedMerchant);
    return hit ? Number(hit.spend || 0) : 0;
  }, [activeMerchantReport, selectedMerchant]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.sage} />
        </Pressable>
        <Text style={styles.title}>Reports</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading || !report ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Merchant Spend Share (pie)</Text>
              <View style={styles.pieWrap}>
                <Svg width={140} height={140}>
                  {(() => {
                    const total = pieData.reduce((s, x) => s + Number(x.spend || 0), 0) || 1;
                    const r = 48;
                    const c = 2 * Math.PI * r;
                    let offset = 0;
                    return pieData.map((m, i) => {
                      const frac = Number(m.spend || 0) / total;
                      const dash = frac * c;
                      const el = (
                        <Circle
                          key={`${m.merchant_name}-${i}`}
                          cx="70"
                          cy="70"
                          r={r}
                          stroke={pieColors[i % pieColors.length]}
                          strokeWidth="20"
                          fill="none"
                          strokeDasharray={`${dash} ${c - dash}`}
                          strokeDashoffset={-offset}
                          rotation="-90"
                          origin="70,70"
                        />
                      );
                      offset += dash;
                      return el;
                    });
                  })()}
                </Svg>
                <View style={{ flex: 1 }}>
                  {pieData.map((m, i) => (
                    <Text key={m.merchant_name} style={styles.meta}>
                      {`\u25A0`} {m.merchant_name} (${money(m.spend)})
                    </Text>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Merchant Spending</Text>
              <Pressable onPress={() => setMerchantPickerOpen(true)} style={styles.selectBtn}>
                <Text style={styles.selectBtnText}>{selectedMerchant || 'Select merchant'}</Text>
              </Pressable>
              <View style={styles.inlineFilters}>
                <View style={styles.inlineRow}>
                  <Pressable onPress={openFromDatePicker} style={[styles.inlineInput, styles.halfInput]}>
                    <Text style={styles.selectBtnText}>{merchantFromDate || 'From date'}</Text>
                  </Pressable>
                  <Pressable onPress={openToDatePicker} style={[styles.inlineInput, styles.halfInput]}>
                    <Text style={styles.selectBtnText}>{merchantToDate || 'To date'}</Text>
                  </Pressable>
                </View>
                <View style={styles.inlineRow}>
                  <Pressable onPress={() => setMonthPickerOpen(true)} style={[styles.inlineInput, styles.halfInput]}>
                    <Text style={styles.selectBtnText}>{merchantMonth || 'Month'}</Text>
                  </Pressable>
                  <Pressable onPress={() => setYearPickerOpen(true)} style={[styles.inlineInput, styles.halfInput]}>
                    <Text style={styles.selectBtnText}>{merchantYear || 'Year'}</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => void loadMerchantFiltered()} style={styles.inlineApplyBtn}>
                  <Text style={styles.applyBtnText}>Apply</Text>
                </Pressable>
              </View>
              {selectedMerchant ? (
                <Text style={styles.meta}>Total spending on {selectedMerchant}: ${money(selectedMerchantSpend)}</Text>
              ) : (
                <Text style={styles.meta}>Choose a merchant to view spending.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top Products by Quantity</Text>
              <View style={styles.gridWrap}>
                {(report.top_products_by_qty || []).slice(0, 12).map((p) => (
                  <Pressable
                    key={p.product}
                    style={styles.gridItem}
                    onPress={() => {
                      setProductDetailName(String(p.product));
                      setProductDetailOpen(true);
                    }}
                  >
                    <Text style={styles.gridItemTitle} numberOfLines={2}>{p.product}</Text>
                    <Text style={styles.gridItemSub}>Qty {Number(p.qty || 0)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Check Specific Product</Text>
              <Pressable onPress={() => setProductPickerOpen(true)} style={styles.selectBtn}>
                <Text style={styles.selectBtnText}>{selectedProduct || 'Select product'}</Text>
              </Pressable>
              <Pressable onPress={() => void checkProductInsights()} style={styles.applyBtn}>
                <Text style={styles.applyBtnText}>Check Product</Text>
              </Pressable>
              {checkedProduct && productReport ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.meta, { color: colors.text, fontWeight: '800' }]}>
                    Insights for: {checkedProduct}
                  </Text>
                  {(productReport.cheapest_by_product || []).slice(0, 5).map((p) => (
                    <Text key={p.product} style={styles.meta}>
                      Lowest price: {p.product} at ${money(p.min_unit_price)} in {p.merchant_name}
                    </Text>
                  ))}
                  {(productReport.purchase_history || []).slice(0, 30).map((h, i) => (
                    <Text key={`${h.product}-${i}`} style={styles.meta}>
                      {h.billed_at ? new Date(h.billed_at).toLocaleDateString() : '-'} · {h.merchant_name} · qty {Number(h.quantity || 0)} · ${money(h.unit_price)}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      {showFromDatePickerIOS ? (
        <DateTimePicker
          value={fromDateObj || new Date()}
          mode="date"
          display="spinner"
          onChange={(_e, d) => {
            if (!d) return;
            setFromDateObj(d);
            setMerchantFromDate(toYmd(d));
          }}
        />
      ) : null}
      {showToDatePickerIOS ? (
        <DateTimePicker
          value={toDateObj || new Date()}
          mode="date"
          display="spinner"
          onChange={(_e, d) => {
            if (!d) return;
            setToDateObj(d);
            setMerchantToDate(toYmd(d));
          }}
        />
      ) : null}

      <Modal visible={merchantPickerOpen} transparent animationType="fade" onRequestClose={() => setMerchantPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Select Merchant</Text>
            <ScrollView style={{ maxHeight: 320, marginTop: 8 }}>
              {merchantOptions.map((m) => (
                <Pressable key={m} onPress={() => { setSelectedMerchant(m); setMerchantPickerOpen(false); }} style={styles.optionRow}>
                  <Text style={styles.meta}>{m}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={monthPickerOpen} transparent animationType="fade" onRequestClose={() => setMonthPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Select Month</Text>
            <ScrollView style={{ maxHeight: 280, marginTop: 8 }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <Pressable key={m} onPress={() => { setMerchantMonth(String(m)); setMonthPickerOpen(false); }} style={styles.optionRow}>
                  <Text style={styles.meta}>{m}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={yearPickerOpen} transparent animationType="fade" onRequestClose={() => setYearPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Select Year</Text>
            <ScrollView style={{ maxHeight: 280, marginTop: 8 }}>
              {Array.from({ length: 12 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <Pressable key={y} onPress={() => { setMerchantYear(String(y)); setYearPickerOpen(false); }} style={styles.optionRow}>
                  <Text style={styles.meta}>{y}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={productPickerOpen} transparent animationType="fade" onRequestClose={() => setProductPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Select Product</Text>
            {productOptions.length === 0 ? (
              <Text style={[styles.meta, { marginTop: 8 }]}>No pantry items yet. Add items in Pantry, or use products from the report grid above.</Text>
            ) : null}
            <ScrollView style={{ maxHeight: 320, marginTop: 8 }}>
              {productOptions.map((p) => (
                <Pressable key={p} onPress={() => { setSelectedProduct(p); setProductPickerOpen(false); }} style={styles.optionRow}>
                  <Text style={styles.meta}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={productDetailOpen} transparent animationType="slide" onRequestClose={() => setProductDetailOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.cardTitle}>{productDetailName}</Text>
              <Pressable onPress={() => setProductDetailOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            {(() => {
              const lowest = (report?.cheapest_by_product || []).find(
                (p) => String(p.product).toLowerCase() === productDetailName.toLowerCase()
              );
              return lowest ? (
                <Text style={[styles.meta, { color: colors.text, fontWeight: '800' }]}>
                  Lowest price suggestion: buy at {lowest.merchant_name} for ${money(lowest.min_unit_price)}
                </Text>
              ) : null;
            })()}
            {(report?.purchase_history || [])
              .filter((h) => String(h.product).toLowerCase() === productDetailName.toLowerCase())
              .slice(0, 40)
              .map((h, i) => (
                <Text key={`${h.product}-${h.merchant_name}-${i}`} style={styles.meta}>
                  {h.billed_at ? new Date(h.billed_at).toLocaleDateString() : '-'} · {h.merchant_name} · qty {Number(h.quantity || 0)} · ${money(h.unit_price)}
                </Text>
              ))}
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
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.sm },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.surfaceInput, paddingHorizontal: 12, paddingVertical: 10, color: colors.text,
  },
  applyBtn: {
    marginTop: 4, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', paddingVertical: 10,
  },
  applyBtnText: { color: colors.canvas, fontWeight: '800' },
  card: {
    backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.md, marginTop: space.sm,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  meta: { marginTop: 4, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  selectBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceInput,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectBtnText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  inlineFilters: {
    marginTop: 8,
    gap: 8,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  inlineInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceInput,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  inlineApplyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  optionRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gridWrap: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '48%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceInput,
    padding: 10,
  },
  gridItemTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  gridItemSub: { marginTop: 4, color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  pieWrap: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 8 },
  barTrack: { marginTop: 4, height: 8, borderRadius: 6, backgroundColor: colors.surfaceInput, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.sage },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlayScrim,
    justifyContent: 'center',
    padding: space.lg,
  },
  modalCard: {
    backgroundColor: colors.canvas,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
});
