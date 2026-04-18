const { query } = require('../db/pool');

const ALLOWED_UNITS = new Set([
  'g',
  'kg',
  'lb',
  'ml',
  'L',
  'pcs',
  'pack',
  'bowl',
  'tub',
  'bag',
  'container',
  'loaf',
]);

function assertUnit(unit) {
  if (!ALLOWED_UNITS.has(unit)) {
    const err = new Error(`Invalid unit: ${unit}`);
    err.code = 'INVALID_UNIT';
    throw err;
  }
}

function rowToApi(row) {
  const name =
    (row.custom_name && String(row.custom_name).trim()) ||
    (row.ingredient_name && String(row.ingredient_name).trim()) ||
    'Item';
  const step = row.step != null ? Number(row.step) : undefined;
  return {
    id: row.id,
    name,
    amount: Number(row.quantity),
    unit: row.unit,
    ...(step != null && !Number.isNaN(step) ? { step } : {}),
    note: row.note || '',
    ingredient_id: row.ingredient_id,
    expiry_date: row.expiry_date,
    is_available: row.is_available,
    updated_at: row.updated_at,
  };
}

async function listByUser(userId) {
  const r = await query(
    `SELECT k.id, k.user_id, k.ingredient_id, k.custom_name, k.quantity, k.unit, k.step,
            k.note, k.weight_grams, k.expiry_date, k.is_available, k.added_at, k.updated_at,
            i.name AS ingredient_name
     FROM kitchen_items k
     LEFT JOIN ingredients_master i ON i.id = k.ingredient_id
     WHERE k.user_id = $1
     ORDER BY k.updated_at DESC`,
    [userId]
  );
  return r.rows.map(rowToApi);
}

async function createItem(userId, body) {
  const {
    name,
    amount,
    unit,
    step,
    note,
    ingredient_id: ingredientId,
    expiry_date: expiryDate,
    weight_grams: weightGrams,
  } = body;

  if (name == null || !String(name).trim()) {
    const err = new Error('Name is required');
    err.code = 'VALIDATION';
    throw err;
  }
  const qty = Number(amount);
  if (Number.isNaN(qty) || qty < 0) {
    const err = new Error('amount must be a non-negative number');
    err.code = 'VALIDATION';
    throw err;
  }
  assertUnit(unit);

  let stepVal = null;
  if (step != null && step !== '') {
    const s = Number(step);
    if (Number.isNaN(s) || s <= 0) {
      const err = new Error('step must be positive when provided');
      err.code = 'VALIDATION';
      throw err;
    }
    stepVal = s;
  }

  const r = await query(
    `INSERT INTO kitchen_items (
       user_id, ingredient_id, custom_name, quantity, unit, step, note, weight_grams, expiry_date
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, user_id, ingredient_id, custom_name, quantity, unit, step, note, weight_grams,
               expiry_date, is_available, added_at, updated_at`,
    [
      userId,
      ingredientId || null,
      String(name).trim(),
      qty,
      unit,
      stepVal,
      note != null ? String(note).trim() : '',
      weightGrams != null ? Number(weightGrams) : null,
      expiryDate || null,
    ]
  );
  const row = r.rows[0];
  const full = await query(
    `SELECT k.id, k.user_id, k.ingredient_id, k.custom_name, k.quantity, k.unit, k.step,
            k.note, k.weight_grams, k.expiry_date, k.is_available, k.added_at, k.updated_at,
            i.name AS ingredient_name
     FROM kitchen_items k
     LEFT JOIN ingredients_master i ON i.id = k.ingredient_id
     WHERE k.id = $1`,
    [row.id]
  );
  return rowToApi(full.rows[0]);
}

async function updateItem(userId, id, body) {
  const current = await query(
    `SELECT k.id, k.user_id, k.ingredient_id, k.custom_name, k.quantity, k.unit, k.step,
            k.note, k.weight_grams, k.expiry_date, k.is_available, k.added_at, k.updated_at,
            i.name AS ingredient_name
     FROM kitchen_items k
     LEFT JOIN ingredients_master i ON i.id = k.ingredient_id
     WHERE k.id = $1 AND k.user_id = $2`,
    [id, userId]
  );
  if (!current.rows[0]) {
    return null;
  }
  const cur = current.rows[0];

  const name =
    body.name != null ? String(body.name).trim() : (cur.custom_name != null ? String(cur.custom_name).trim() : '');
  const qty = body.amount != null ? Number(body.amount) : Number(cur.quantity);
  const unit = body.unit != null ? body.unit : cur.unit;
  const note = body.note != null ? String(body.note).trim() : cur.note;
  let stepVal = cur.step;
  if (body.step !== undefined) {
    if (body.step === null || body.step === '') {
      stepVal = null;
    } else {
      const s = Number(body.step);
      if (Number.isNaN(s) || s <= 0) {
        const err = new Error('step must be positive when provided');
        err.code = 'VALIDATION';
        throw err;
      }
      stepVal = s;
    }
  }

  let expiryDate = cur.expiry_date;
  if (body.expiry_date !== undefined) {
    expiryDate = body.expiry_date || null;
  }
  let isAvailable = cur.is_available;
  if (body.is_available !== undefined) {
    isAvailable = Boolean(body.is_available);
  }

  if (!name) {
    const err = new Error('Name is required');
    err.code = 'VALIDATION';
    throw err;
  }
  if (Number.isNaN(qty) || qty < 0) {
    const err = new Error('amount must be a non-negative number');
    err.code = 'VALIDATION';
    throw err;
  }
  assertUnit(unit);

  await query(
    `UPDATE kitchen_items SET
       custom_name = $1,
       quantity = $2,
       unit = $3,
       step = $4,
       note = $5,
       expiry_date = $6,
       is_available = $7
     WHERE id = $8 AND user_id = $9`,
    [name, qty, unit, stepVal, note, expiryDate, isAvailable, id, userId]
  );

  const full = await query(
    `SELECT k.id, k.user_id, k.ingredient_id, k.custom_name, k.quantity, k.unit, k.step,
            k.note, k.weight_grams, k.expiry_date, k.is_available, k.added_at, k.updated_at,
            i.name AS ingredient_name
     FROM kitchen_items k
     LEFT JOIN ingredients_master i ON i.id = k.ingredient_id
     WHERE k.id = $1 AND k.user_id = $2`,
    [id, userId]
  );
  return rowToApi(full.rows[0]);
}

async function deleteItem(userId, id) {
  const r = await query(
    `DELETE FROM kitchen_items WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );
  return !!r.rows[0];
}

module.exports = {
  listByUser,
  createItem,
  updateItem,
  deleteItem,
  ALLOWED_UNITS,
};
