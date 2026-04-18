import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

const DEFAULT_PORT = 5051;
const DEFAULT_SCAN_PORT = 8000;
const DEBUG_API = true;

function apiDebug(label: string, meta?: unknown) {
  if (!DEBUG_API) return;
  const ts = new Date().toISOString();
  if (meta !== undefined) {
    console.log(`[MobileAPI ${ts}] ${label}`, meta);
  } else {
    console.log(`[MobileAPI ${ts}] ${label}`);
  }
}

function isAndroidEmulator(): boolean {
  return Platform.OS === 'android' && Constants.isDevice === false;
}

/** True for a real phone/tablet (not simulator / not Expo web). Loopback API env is ignored so we can discover LAN. */
function isPhysicalDevice(): boolean {
  return Constants.isDevice === true;
}

function isLoopbackBaseUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === '127.0.0.1' || h === 'localhost';
  } catch {
    return false;
  }
}

/** Hostname of the Metro packager (LAN), for dev API base when env uses useless loopback on a real phone. */
function devHostFromPackager(): string | null {
  try {
    const raw = NativeModules.SourceCode?.scriptURL as string | undefined;
    if (!raw || typeof raw !== 'string') return null;
    const normalized = /^https?:\/\//i.test(raw) ? raw : `http://${raw.replace(/^\//, '')}`;
    const { hostname } = new URL(normalized);
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return hostname;
    }
  } catch {
    return null;
  }
  return null;
}

/** On Android emulators, 127.0.0.1 is the emulator itself, not the dev machine. */
function finalizeAndroidDevBaseUrl(candidate: string): string {
  const trimmed = candidate.replace(/\/$/, '');
  if (!isAndroidEmulator()) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') {
      u.hostname = '10.0.2.2';
      const out = u.toString().replace(/\/$/, '');
      apiDebug('finalizeAndroidDevBaseUrl emulator loopback remap', { from: trimmed, to: out });
      return out;
    }
  } catch {
    /* ignore invalid URLs */
  }
  return trimmed;
}

/** Scan service on same host as the resolved kitchen API (port 8000). */
function scanBaseFromResolvedKitchenHost(): string | null {
  try {
    const api = resolveApiBaseUrlForScanSibling();
    const u = new URL(api);
    u.port = String(DEFAULT_SCAN_PORT);
    return u.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

/**
 * Kitchen API base for deriving scan URL, without reading scan env (avoids recursion with getScanApiBaseUrl).
 * Skips EXPO_PUBLIC loopback on Android physical so sibling scan matches a reachable API host.
 */
function resolveApiBaseUrlForScanSibling(): string {
  const rawEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  const useEnv =
    rawEnv &&
    !(isPhysicalDevice() && isLoopbackBaseUrl(rawEnv));
  if (useEnv && rawEnv) {
    return finalizeAndroidDevBaseUrl(rawEnv);
  }
  const fromExtra = String(
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ?? ''
  ).trim();
  if (fromExtra) {
    return finalizeAndroidDevBaseUrl(fromExtra.replace(/\/$/, ''));
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return finalizeAndroidDevBaseUrl(`http://${host}:${DEFAULT_PORT}`);
    }
  }
  const packager = devHostFromPackager();
  if (packager) {
    return finalizeAndroidDevBaseUrl(`http://${packager}:${DEFAULT_PORT}`);
  }
  if (Platform.OS === 'android') {
    return finalizeAndroidDevBaseUrl(
      isAndroidEmulator() ? `http://10.0.2.2:${DEFAULT_PORT}` : `http://127.0.0.1:${DEFAULT_PORT}`
    );
  }
  return finalizeAndroidDevBaseUrl(`http://127.0.0.1:${DEFAULT_PORT}`);
}

export function getApiBaseUrl(): string {
  const rawEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  const useEnv =
    rawEnv && !(isPhysicalDevice() && isLoopbackBaseUrl(rawEnv));
  if (useEnv && rawEnv) {
    apiDebug('getApiBaseUrl from EXPO_PUBLIC_API_URL', { value: rawEnv, platform: Platform.OS });
    return finalizeAndroidDevBaseUrl(rawEnv);
  }
  if (rawEnv && isPhysicalDevice() && isLoopbackBaseUrl(rawEnv)) {
    apiDebug('getApiBaseUrl skip EXPO_PUBLIC loopback on physical device', {
      ignored: rawEnv,
      platform: Platform.OS,
    });
  }
  const fromExtra = String(
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ?? ''
  ).trim();
  if (fromExtra) {
    apiDebug('getApiBaseUrl from expo.extra.apiUrl', { value: fromExtra, platform: Platform.OS });
    return finalizeAndroidDevBaseUrl(fromExtra.replace(/\/$/, ''));
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      const v = `http://${host}:${DEFAULT_PORT}`;
      apiDebug('getApiBaseUrl from hostUri', { value: v, hostUri, platform: Platform.OS });
      return finalizeAndroidDevBaseUrl(v);
    }
  }
  const packager = devHostFromPackager();
  if (packager) {
    const v = `http://${packager}:${DEFAULT_PORT}`;
    apiDebug('getApiBaseUrl from packager scriptURL', { value: v, platform: Platform.OS });
    return finalizeAndroidDevBaseUrl(v);
  }
  if (Platform.OS === 'android') {
    const v = isAndroidEmulator()
      ? `http://10.0.2.2:${DEFAULT_PORT}`
      : `http://127.0.0.1:${DEFAULT_PORT}`;
    apiDebug('getApiBaseUrl android fallback', { value: v, platform: Platform.OS });
    return finalizeAndroidDevBaseUrl(v);
  }
  const v = `http://127.0.0.1:${DEFAULT_PORT}`;
  apiDebug('getApiBaseUrl default fallback', { value: v, platform: Platform.OS });
  return finalizeAndroidDevBaseUrl(v);
}

export function getScanApiBaseUrl(): string {
  const rawScanEnv = process.env.EXPO_PUBLIC_SCAN_API_URL?.replace(/\/$/, '');
  const useScanEnv =
    rawScanEnv && !(isPhysicalDevice() && isLoopbackBaseUrl(rawScanEnv));
  if (useScanEnv && rawScanEnv) {
    apiDebug('getScanApiBaseUrl from EXPO_PUBLIC_SCAN_API_URL', { value: rawScanEnv, platform: Platform.OS });
    return finalizeAndroidDevBaseUrl(rawScanEnv);
  }
  if (rawScanEnv && isPhysicalDevice() && isLoopbackBaseUrl(rawScanEnv)) {
    apiDebug('getScanApiBaseUrl skip EXPO_PUBLIC loopback on physical device', {
      ignored: rawScanEnv,
      platform: Platform.OS,
    });
  }
  const fromExtra = String(
    (Constants.expoConfig?.extra as { scanApiUrl?: string } | undefined)?.scanApiUrl ?? ''
  ).trim();
  if (fromExtra) {
    apiDebug('getScanApiBaseUrl from expo.extra.scanApiUrl', { value: fromExtra, platform: Platform.OS });
    return finalizeAndroidDevBaseUrl(fromExtra.replace(/\/$/, ''));
  }
  const fromKitchenHost = scanBaseFromResolvedKitchenHost();
  if (fromKitchenHost) {
    apiDebug('getScanApiBaseUrl derived from kitchen API host', { value: fromKitchenHost, platform: Platform.OS });
    return finalizeAndroidDevBaseUrl(fromKitchenHost);
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      const v = `http://${host}:${DEFAULT_SCAN_PORT}`;
      apiDebug('getScanApiBaseUrl from hostUri', { value: v, hostUri, platform: Platform.OS });
      return finalizeAndroidDevBaseUrl(v);
    }
  }
  const packager = devHostFromPackager();
  if (packager) {
    const v = `http://${packager}:${DEFAULT_SCAN_PORT}`;
    apiDebug('getScanApiBaseUrl from packager scriptURL', { value: v, platform: Platform.OS });
    return finalizeAndroidDevBaseUrl(v);
  }
  if (Platform.OS === 'android') {
    const v = isAndroidEmulator()
      ? `http://10.0.2.2:${DEFAULT_SCAN_PORT}`
      : `http://127.0.0.1:${DEFAULT_SCAN_PORT}`;
    apiDebug('getScanApiBaseUrl android fallback', { value: v, platform: Platform.OS });
    return finalizeAndroidDevBaseUrl(v);
  }
  const v = `http://127.0.0.1:${DEFAULT_SCAN_PORT}`;
  apiDebug('getScanApiBaseUrl default fallback', { value: v, platform: Platform.OS });
  return finalizeAndroidDevBaseUrl(v);
}

export type HealthResponse = { ok: boolean; service?: string; time?: string };
export type AuthUser = { id: string; email: string; name: string };
export type AuthResponse = { user: AuthUser; token: string };

async function parseJson(res: Response): Promise<{ message?: string; [k: string]: unknown }> {
  try {
    return (await res.json()) as { message?: string };
  } catch {
    return {};
  }
}

const API_FETCH_TIMEOUT_MS = 25_000;
const RECEIPT_PREVIEW_TIMEOUT_MS = 120_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
  context: string
): Promise<Response> {
  const outer = init?.signal;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onOuterAbort = () => controller.abort();
  if (outer) {
    if (outer.aborted) {
      clearTimeout(timer);
      throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
    }
    outer.addEventListener('abort', onOuterAbort, { once: true });
  }
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      if (timedOut) {
        throw new Error(
          `${context}: timed out after ${Math.round(timeoutMs / 1000)}s. Check the server, USB debugging, and run "npm run reverse:android".`,
        );
      }
      throw e;
    }
    throw e;
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener('abort', onOuterAbort);
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  const base = getApiBaseUrl();
  const res = await fetchWithTimeout(`${base}/api/health`, undefined, API_FETCH_TIMEOUT_MS, 'Health check');
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error((data.message as string) || 'Health check failed');
  }
  return data as HealthResponse;
}

export async function registerUser(body: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResponse> {
  const base = getApiBaseUrl();
  apiDebug('registerUser request', { url: `${base}/api/auth/register`, email: body.email });
  const res = await fetchWithTimeout(
    `${base}/api/auth/register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    },
    API_FETCH_TIMEOUT_MS,
    'Register',
  );
  const data = await parseJson(res);
  apiDebug('registerUser response', { status: res.status, ok: res.ok, message: data.message });
  if (!res.ok) {
    throw new Error((data.message as string) || 'Registration failed');
  }
  return data as AuthResponse;
}

export async function loginUser(body: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const base = getApiBaseUrl();
  apiDebug('loginUser request', { url: `${base}/api/auth/login`, email: body.email });
  const res = await fetchWithTimeout(
    `${base}/api/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    },
    API_FETCH_TIMEOUT_MS,
    'Login',
  );
  const data = await parseJson(res);
  apiDebug('loginUser response', { status: res.status, ok: res.ok, message: data.message });
  if (!res.ok) {
    throw new Error((data.message as string) || 'Login failed');
  }
  return data as AuthResponse;
}

export type KitchenItemDto = {
  id: string;
  name: string;
  amount: number;
  unit: string;
  step?: number;
  note: string;
  ingredient_id?: string | null;
  expiry_date?: string | null;
  is_available?: boolean;
  updated_at?: string;
};

export type ScanPreviewItem = {
  raw_name: string;
  normalized_name?: string | null;
  category?: string | null;
  price?: number | null;
  quantity?: number | null;
  unit?: string | null;
  line_subtotal?: number | null;
  line_tax?: number | null;
  line_total?: number | null;
  estimated_expiration_date?: string | null;
};

export type ScanPreviewResponse = {
  merchant: string;
  date?: string | null;
  location_text?: string | null;
  total?: number | null;
  subtotal?: number | null;
  tax?: number | null;
  items: ScanPreviewItem[];
};

export type SaveBillRequest = {
  merchant_name: string;
  billed_at?: string | null;
  location_text?: string | null;
  subtotal?: number | null;
  tax_amount?: number | null;
  total_amount?: number | null;
  tax_rate?: number | null;
  items: Array<{
    raw_name: string;
    normalized_name?: string | null;
    category?: string | null;
    quantity?: number | null;
    unit?: string | null;
    unit_price?: number | null;
    line_subtotal?: number | null;
    line_tax?: number | null;
    line_total?: number | null;
  }>;
};

export type BillListItem = {
  id: string;
  merchant_name: string;
  billed_at?: string | null;
  location_text?: string | null;
  subtotal?: number | string | null;
  tax_amount?: number | string | null;
  total_amount?: number | string | null;
  item_count?: number;
};

export type BillDetailItem = {
  id: string;
  raw_name: string;
  normalized_name?: string | null;
  category?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  unit_price?: number | string | null;
  line_tax?: number | string | null;
  line_total?: number | string | null;
};

export type BillDetail = BillListItem & {
  items: BillDetailItem[];
};

export type BillsReport = {
  totals: { bills_count: number | string; total_spend: number | string; total_tax: number | string };
  merchant_spend: Array<{ merchant_name: string; spend: number | string }>;
  top_products_by_qty: Array<{ product: string; qty: number | string }>;
  cheapest_by_product: Array<{ product: string; min_unit_price: number | string; merchant_name: string }>;
  purchase_history: Array<{
    product: string;
    merchant_name: string;
    unit_price: number | string;
    quantity: number | string;
    billed_at: string;
  }>;
};

function kitchenHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  } as const;
}

/** Postgres `numeric` often serializes as string; coerce for the UI. */
function normalizeKitchenItemDto(raw: unknown): KitchenItemDto | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : '';
  if (!id) {
    return null;
  }
  const amountRaw = o.amount;
  let amount = 0;
  if (typeof amountRaw === 'number' && Number.isFinite(amountRaw)) {
    amount = amountRaw;
  } else {
    const p = Number.parseFloat(String(amountRaw ?? '0'));
    amount = Number.isFinite(p) ? p : 0;
  }
  let step: number | undefined;
  if (o.step != null && o.step !== '') {
    const s = typeof o.step === 'number' ? o.step : Number.parseFloat(String(o.step));
    if (Number.isFinite(s) && s > 0) {
      step = s;
    }
  }
  return {
    id,
    name: String(o.name ?? 'Item'),
    amount,
    unit: String(o.unit ?? 'pcs'),
    ...(step != null ? { step } : {}),
    note: String(o.note ?? ''),
    ingredient_id: o.ingredient_id != null ? String(o.ingredient_id) : null,
    expiry_date: o.expiry_date != null ? String(o.expiry_date) : null,
    is_available: typeof o.is_available === 'boolean' ? o.is_available : undefined,
    updated_at: o.updated_at != null ? String(o.updated_at) : undefined,
  };
}

export async function fetchKitchenItems(token: string, signal?: AbortSignal): Promise<KitchenItemDto[]> {
  const base = getApiBaseUrl();
  apiDebug('fetchKitchenItems request', {
    url: `${base}/api/kitchen/items`,
    tokenPrefix: token ? `${token.slice(0, 12)}...` : 'none',
  });
  const res = await fetchWithTimeout(
    `${base}/api/kitchen/items`,
    { headers: kitchenHeaders(token), signal },
    API_FETCH_TIMEOUT_MS,
    'Load pantry',
  );
  const data = await parseJson(res);
  apiDebug('fetchKitchenItems response', { status: res.status, ok: res.ok, message: data.message });
  if (!res.ok) {
    throw new Error((data.message as string) || 'Failed to load pantry');
  }
  const rawItems = (data as { items?: unknown }).items;
  if (!Array.isArray(rawItems)) {
    return [];
  }
  return rawItems.map(normalizeKitchenItemDto).filter((x): x is KitchenItemDto => x != null);
}

export async function createKitchenItem(
  token: string,
  body: { name: string; amount: number; unit: string; note?: string; step?: number | null }
): Promise<KitchenItemDto> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/kitchen/items`, {
    method: 'POST',
    headers: kitchenHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error((data.message as string) || 'Failed to add item');
  }
  const item = normalizeKitchenItemDto((data as { item?: unknown }).item);
  if (!item) {
    throw new Error('Invalid response from server');
  }
  return item;
}

export async function updateKitchenItem(
  token: string,
  id: string,
  body: {
    name?: string;
    amount?: number;
    unit?: string;
    note?: string;
    step?: number | null;
    expiry_date?: string | null;
    is_available?: boolean;
  }
): Promise<KitchenItemDto> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/kitchen/items/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: kitchenHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error((data.message as string) || 'Failed to update item');
  }
  const item = normalizeKitchenItemDto((data as { item?: unknown }).item);
  if (!item) {
    throw new Error('Invalid response from server');
  }
  return item;
}

export async function deleteKitchenItem(token: string, id: string): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/kitchen/items/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: kitchenHeaders(token),
  });
  if (res.status === 204) {
    return;
  }
  const data = await parseJson(res);
  if (res.status === 404) {
    throw new Error((data.message as string) || 'Item not found on server');
  }
  throw new Error((data.message as string) || `Failed to delete item (${res.status})`);
}

/**
 * Sends the receipt image to the kitchen API, which proxies to ScanAndSave (FastAPI).
 * Avoids calling port 8000 from the phone (adb reverse often only covers 5051 reliably).
 */
export async function uploadReceiptForPreview(
  authToken: string,
  imageUri: string,
  filename = 'receipt.jpg'
): Promise<ScanPreviewResponse> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const url = `${base}/api/scan/receipt-preview`;
  apiDebug('uploadReceiptForPreview request', { url, imageUri });
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    name: filename,
    type: 'image/jpeg',
  } as unknown as Blob);
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    },
    RECEIPT_PREVIEW_TIMEOUT_MS,
    'Receipt scan',
  );
  const data = await parseJson(res);
  apiDebug('uploadReceiptForPreview response', {
    status: res.status,
    ok: res.ok,
    message: data.message ?? data.detail,
    itemsCount: Array.isArray((data as { items?: unknown }).items)
      ? ((data as { items?: unknown[] }).items?.length ?? 0)
      : -1,
  });
  if (!res.ok) {
    throw new Error((data.message as string) || (data.detail as string) || 'Receipt scan failed');
  }
  const items = Array.isArray((data as { items?: unknown }).items)
    ? ((data as { items: unknown[] }).items as ScanPreviewItem[])
    : [];
  return {
    merchant: String((data as { merchant?: unknown }).merchant ?? 'Unknown Store'),
    date: (data as { date?: string | null }).date ?? null,
    location_text: (data as { location_text?: string | null }).location_text ?? null,
    total: typeof (data as { total?: unknown }).total === 'number' ? (data as { total?: number }).total! : null,
    subtotal:
      typeof (data as { subtotal?: unknown }).subtotal === 'number'
        ? (data as { subtotal?: number }).subtotal!
        : null,
    tax: typeof (data as { tax?: unknown }).tax === 'number' ? (data as { tax?: number }).tax! : null,
    items,
  };
}

export async function saveScannedBillAndAddPantry(token: string, body: SaveBillRequest): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/bills/save-and-add`, {
    method: 'POST',
    headers: kitchenHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error((data.message as string) || 'Failed to save bill and add pantry items');
  }
}

export async function fetchBills(token: string): Promise<BillListItem[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/bills`, {
    headers: kitchenHeaders(token),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error((data.message as string) || 'Failed to load bills');
  }
  const bills = (data as { bills?: unknown }).bills;
  return Array.isArray(bills) ? (bills as BillListItem[]) : [];
}

export async function fetchBillDetail(token: string, id: string): Promise<BillDetail> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/bills/${encodeURIComponent(id)}`, {
    headers: kitchenHeaders(token),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error((data.message as string) || 'Failed to load bill detail');
  }
  const bill = (data as { bill?: unknown }).bill as BillDetail | undefined;
  if (!bill) {
    throw new Error('Invalid bill detail response');
  }
  return bill;
}

export async function deleteBill(token: string, id: string): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/bills/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: kitchenHeaders(token),
  });
  if (res.status === 204) return;
  const data = await parseJson(res);
  throw new Error((data.message as string) || 'Failed to delete bill');
}

export async function updateBill(
  token: string,
  id: string,
  body: {
    merchant_name?: string;
    billed_at?: string;
    location_text?: string;
    subtotal?: number;
    tax_amount?: number;
    total_amount?: number;
  }
): Promise<BillDetail> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/bills/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: kitchenHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error((data.message as string) || 'Failed to update bill');
  }
  const bill = (data as { bill?: unknown }).bill as BillDetail | undefined;
  if (!bill) throw new Error('Invalid bill response');
  return bill;
}

export async function fetchBillsReport(
  token: string,
  filters?: { date?: string; fromDate?: string; toDate?: string; month?: string; year?: string; company?: string; product?: string }
): Promise<BillsReport> {
  const base = getApiBaseUrl();
  const q = new URLSearchParams();
  if (filters?.date) q.set('date', filters.date);
  if (filters?.fromDate) q.set('fromDate', filters.fromDate);
  if (filters?.toDate) q.set('toDate', filters.toDate);
  if (filters?.month) q.set('month', filters.month);
  if (filters?.year) q.set('year', filters.year);
  if (filters?.company) q.set('company', filters.company);
  if (filters?.product) q.set('product', filters.product);
  const res = await fetch(`${base}/api/bills/report${q.toString() ? `?${q.toString()}` : ''}`, {
    headers: kitchenHeaders(token),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error((data.message as string) || 'Failed to load report');
  return ((data as { report?: BillsReport }).report || {
    totals: { bills_count: 0, total_spend: 0, total_tax: 0 },
    merchant_spend: [],
    top_products_by_qty: [],
    cheapest_by_product: [],
    purchase_history: [],
  }) as BillsReport;
}

export async function revertLatestBill(token: string): Promise<{ reverted_bill_id: string; adjusted_items?: number }> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/bills/revert-latest`, {
    method: 'POST',
    headers: kitchenHeaders(token),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error((data.message as string) || 'Failed to revert latest bill');
  }
  return data as { reverted_bill_id: string; adjusted_items?: number };
}
