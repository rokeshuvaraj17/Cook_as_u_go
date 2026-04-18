/** How quantity is counted — drives default +/- step and labels. */
export type PantryUnit =
  | 'g'
  | 'kg'
  | 'lb'
  | 'ml'
  | 'L'
  | 'pcs'
  | 'pack'
  | 'bowl'
  | 'tub'
  | 'bag'
  | 'container'
  | 'loaf';

export type PantryProduct = {
  id: string;
  name: string;
  /** Numeric amount (grams, ml, liters, pieces, bowls, etc. — see `unit`). */
  amount: number;
  unit: PantryUnit;
  /** Optional override for +/- buttons (e.g. fine steps for spices). */
  step?: number;
  note: string;
};

const MASS_UNITS: PantryUnit[] = ['g', 'kg', 'lb'];
const VOLUME_UNITS: PantryUnit[] = ['ml', 'L'];
const COUNT_UNITS: PantryUnit[] = ['pcs', 'pack', 'bowl', 'tub', 'bag', 'container', 'loaf'];

export function defaultStepForUnit(unit: PantryUnit): number {
  switch (unit) {
    case 'g':
      return 25;
    case 'kg':
      return 0.05;
    case 'lb':
      return 0.25;
    case 'ml':
      return 50;
    case 'L':
      return 0.1;
    case 'pcs':
    case 'pack':
    case 'bowl':
    case 'tub':
    case 'bag':
    case 'container':
    case 'loaf':
      return 1;
    default:
      return 1;
  }
}

export function stepForProduct(p: Pick<PantryProduct, 'unit' | 'step'>): number {
  return p.step ?? defaultStepForUnit(p.unit);
}

/** Snap floats for display / storage (avoid 0.30000000004). */
export function normalizeAmount(amount: number, unit: PantryUnit): number {
  if (unit === 'kg' || unit === 'L' || unit === 'lb') {
    return Math.round(amount * 1000) / 1000;
  }
  if (unit === 'g' || unit === 'ml') {
    return Math.round(amount);
  }
  if (Number.isInteger(amount)) return amount;
  return Math.round(amount * 100) / 100;
}

export function formatPantryQty(amount: number, unit: PantryUnit): string {
  const n = normalizeAmount(amount, unit);
  const isInt = Math.abs(n - Math.round(n)) < 1e-6;
  const s = isInt ? String(Math.round(n)) : String(n);
  switch (unit) {
    case 'g':
      return `${s} g`;
    case 'kg':
      return `${s} kg`;
    case 'lb':
      return `${s} lb`;
    case 'ml':
      return `${s} ml`;
    case 'L':
      return `${s} L`;
    case 'pcs':
      return `${s} pcs`;
    case 'pack':
      return `${s} ${n === 1 ? 'pack' : 'packs'}`;
    case 'bowl':
      return `${s} ${n === 1 ? 'bowl' : 'bowls'}`;
    case 'tub':
      return `${s} ${n === 1 ? 'tub' : 'tubs'}`;
    case 'bag':
      return `${s} ${n === 1 ? 'bag' : 'bags'}`;
    case 'container':
      return `${s} ${n === 1 ? 'container' : 'containers'}`;
    case 'loaf':
      return `${s} ${n === 1 ? 'loaf' : 'loaves'}`;
    default:
      return s;
  }
}

export function unitsSameFamily(a: PantryUnit, b: PantryUnit): boolean {
  const inMass = (u: PantryUnit) => MASS_UNITS.includes(u);
  const inVol = (u: PantryUnit) => VOLUME_UNITS.includes(u);
  const inCount = (u: PantryUnit) => COUNT_UNITS.includes(u);
  if (inMass(a) && inMass(b)) return true;
  if (inVol(a) && inVol(b)) return true;
  if (inCount(a) && inCount(b)) return true;
  return false;
}

/** When changing unit within mass or volume, convert `amount` to the new unit. */
export function convertAmount(amount: number, from: PantryUnit, to: PantryUnit): number {
  if (from === to) return amount;
  if (from === 'g' && to === 'kg') return amount / 1000;
  if (from === 'kg' && to === 'g') return amount * 1000;
  if (from === 'lb' && to === 'g') return amount * 453.592;
  if (from === 'g' && to === 'lb') return amount / 453.592;
  if (from === 'lb' && to === 'kg') return amount * 0.453592;
  if (from === 'kg' && to === 'lb') return amount / 0.453592;
  if (from === 'ml' && to === 'L') return amount / 1000;
  if (from === 'L' && to === 'ml') return amount * 1000;
  return amount;
}

export const ALL_UNITS: PantryUnit[] = [
  ...MASS_UNITS,
  ...VOLUME_UNITS,
  ...COUNT_UNITS,
];

export function createInitialPantry(): PantryProduct[] {
  return [
    { id: 'seed-1', name: 'Cherry tomatoes', amount: 200, unit: 'g', note: 'Salad drawer' },
    { id: 'seed-2', name: 'Cooked basmati rice', amount: 1, unit: 'bowl', note: 'From yesterday' },
    { id: 'seed-3', name: 'Paneer', amount: 150, unit: 'g', note: 'Opened 2 days ago' },
    { id: 'seed-4', name: 'Baby spinach', amount: 1, unit: 'bag', note: 'Use soon' },
    { id: 'seed-5', name: 'Greek yogurt', amount: 0.5, unit: 'tub', note: 'Good till Fri' },
    { id: 'seed-6', name: 'Lime', amount: 3, unit: 'pcs', note: 'Counter bowl' },
    { id: 'seed-7', name: 'Roasted veggies', amount: 1, unit: 'container', note: 'Meal prep' },
  ];
}

export function newProductId() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Demo line items “read” from a receipt after the user picks a photo (no real OCR yet). */
export const DEMO_BILL_LINE_ITEMS: Omit<PantryProduct, 'id'>[] = [
  { name: 'Low-fat milk', amount: 1, unit: 'L', note: 'Receipt scan (demo)' },
  { name: 'Brown eggs', amount: 12, unit: 'pcs', note: 'Receipt scan (demo)' },
  { name: 'Bananas', amount: 6, unit: 'pcs', note: 'Receipt scan (demo)' },
  { name: 'Whole wheat bread', amount: 1, unit: 'loaf', note: 'Receipt scan (demo)' },
  { name: 'Cheddar cheese', amount: 200, unit: 'g', note: 'Receipt scan (demo)' },
];
