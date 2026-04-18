const { getPool } = require('../db/pool');

const DEFAULT_US_TAX_RATE = Number.parseFloat(process.env.US_DEFAULT_TAX_RATE || '0.0725');

function toMoney(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n * 100) / 100;
}

function toPositive(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function normalizeBillInput(payload) {
  const merchantName = String(payload?.merchant_name || payload?.merchant || 'Scanned receipt').trim();
  const locationText = payload?.location_text != null ? String(payload.location_text).trim() : null;
  const billedAtRaw = payload?.billed_at || payload?.date || null;
  const billedAt = billedAtRaw ? new Date(String(billedAtRaw)) : null;
  const safeBilledAt = billedAt && !Number.isNaN(billedAt.getTime()) ? billedAt.toISOString() : new Date().toISOString();

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const taxRate = Number.isFinite(Number(payload?.tax_rate))
    ? Number(payload.tax_rate)
    : DEFAULT_US_TAX_RATE;

  const normalizedItems = items.map((it) => {
    const qty = toPositive(it?.quantity, 1);
    const unitPrice = it?.unit_price != null ? toMoney(it.unit_price, 0) : null;
    const lineSubtotalFromUnit = unitPrice != null ? toMoney(unitPrice * qty, 0) : null;
    const providedLineTax = it?.line_tax != null ? toMoney(it.line_tax, 0) : null;
    const providedLineTotal = it?.line_total != null ? toMoney(it.line_total, 0) : null;
    const lineSubtotal =
      it?.line_subtotal != null
        ? toMoney(it.line_subtotal, lineSubtotalFromUnit ?? 0)
        : lineSubtotalFromUnit != null
          ? lineSubtotalFromUnit
          : providedLineTotal != null
            ? toMoney(providedLineTotal - (providedLineTax ?? toMoney(providedLineTotal * (taxRate / (1 + taxRate)), 0)), 0)
            : 0;
    const lineTax =
      providedLineTax != null
        ? providedLineTax
        : toMoney(lineSubtotal * taxRate, 0);
    const lineTotal =
      providedLineTotal != null
        ? providedLineTotal
        : toMoney(lineSubtotal + lineTax, 0);

    return {
      raw_name: String(it?.raw_name || it?.normalized_name || 'Item').trim(),
      normalized_name: it?.normalized_name != null ? String(it.normalized_name).trim() : null,
      category: it?.category != null ? String(it.category).trim() : null,
      quantity: qty,
      unit: String(it?.unit || 'pcs').trim() || 'pcs',
      unit_price: unitPrice,
      line_subtotal: lineSubtotal,
      line_tax: lineTax,
      line_total: lineTotal,
      estimated_tax_rate: taxRate,
      pantry_note: `Scanned from ${merchantName}`,
    };
  });

  const derivedSubtotal = toMoney(normalizedItems.reduce((sum, x) => sum + toMoney(x.line_subtotal, 0), 0), 0);
  const derivedTax = toMoney(normalizedItems.reduce((sum, x) => sum + toMoney(x.line_tax, 0), 0), toMoney(derivedSubtotal * taxRate, 0));
  const derivedTotal = toMoney(normalizedItems.reduce((sum, x) => sum + toMoney(x.line_total, 0), 0), toMoney(derivedSubtotal + derivedTax, 0));
  const subtotal =
    payload?.subtotal != null ? toMoney(payload.subtotal, derivedSubtotal) : derivedSubtotal;
  const taxAmount =
    payload?.tax_amount != null
      ? toMoney(payload.tax_amount, derivedTax)
      : payload?.tax != null
        ? toMoney(payload.tax, derivedTax)
        : derivedTax;
  const totalAmount =
    payload?.total_amount != null
      ? toMoney(payload.total_amount, derivedTotal)
      : payload?.total != null
        ? toMoney(payload.total, derivedTotal)
        : derivedTotal;

  return {
    merchantName: merchantName || 'Scanned receipt',
    billedAt: safeBilledAt,
    locationText,
    subtotal,
    taxAmount,
    totalAmount,
    taxRate,
    items: normalizedItems,
  };
}

async function saveBillAndPantryItems(userId, payload) {
  const input = normalizeBillInput(payload);
  if (!input.items.length) {
    const e = new Error('At least one bill item is required');
    e.code = 'VALIDATION';
    throw e;
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const billRes = await client.query(
      `INSERT INTO bill_records (
        user_id, merchant_name, billed_at, location_text, subtotal, tax_amount, total_amount, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'scan')
      RETURNING id, merchant_name, billed_at, location_text, subtotal, tax_amount, total_amount, created_at`,
      [
        userId,
        input.merchantName,
        input.billedAt,
        input.locationText,
        input.subtotal,
        input.taxAmount,
        input.totalAmount,
      ]
    );
    const bill = billRes.rows[0];

    const savedItems = [];
    for (const it of input.items) {
      const itemName = (it.normalized_name || it.raw_name).trim();
      const existing = await client.query(
        `SELECT id, custom_name, quantity, unit, note, updated_at
         FROM kitchen_items
         WHERE user_id = $1
           AND lower(trim(custom_name)) = lower(trim($2))
           AND unit = $3
         LIMIT 1
         FOR UPDATE`,
        [userId, itemName, it.unit]
      );

      let pantryItem;
      if (existing.rows[0]) {
        const updatedQty = toPositive(existing.rows[0].quantity, 0) + toPositive(it.quantity, 1);
        const updated = await client.query(
          `UPDATE kitchen_items
           SET quantity = $1, note = $2
           WHERE id = $3
           RETURNING id, custom_name, quantity, unit, note, updated_at`,
          [updatedQty, existing.rows[0].note || it.pantry_note, existing.rows[0].id]
        );
        pantryItem = updated.rows[0];
      } else {
        const pantry = await client.query(
          `INSERT INTO kitchen_items (
            user_id, custom_name, quantity, unit, note
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING id, custom_name, quantity, unit, note, updated_at`,
          [userId, itemName, it.quantity, it.unit, it.pantry_note]
        );
        pantryItem = pantry.rows[0];
      }

      const bi = await client.query(
        `INSERT INTO bill_items (
          bill_id, pantry_item_id, raw_name, normalized_name, category, quantity, unit,
          unit_price, line_subtotal, line_tax, line_total, estimated_tax_rate
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING id, raw_name, normalized_name, category, quantity, unit,
                  unit_price, line_subtotal, line_tax, line_total, estimated_tax_rate`,
        [
          bill.id,
          pantryItem.id,
          it.raw_name,
          it.normalized_name,
          it.category,
          it.quantity,
          it.unit,
          it.unit_price,
          it.line_subtotal,
          it.line_tax,
          it.line_total,
          it.estimated_tax_rate,
        ]
      );

      savedItems.push({
        pantry_item: pantryItem,
        bill_item: bi.rows[0],
      });
    }

    await client.query('COMMIT');
    return { bill, items: savedItems };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function listBillsByUser(userId, filters = {}) {
  const where = ['br.user_id = $1'];
  const params = [userId];
  let idx = 2;

  if (filters.store) {
    where.push(`lower(br.merchant_name) LIKE $${idx++}`);
    params.push(`%${String(filters.store).trim().toLowerCase()}%`);
  }
  if (filters.fromDate) {
    where.push(`date(br.billed_at) >= $${idx++}`);
    params.push(filters.fromDate);
  }
  if (filters.toDate) {
    where.push(`date(br.billed_at) <= $${idx++}`);
    params.push(filters.toDate);
  }
  if (filters.minSpend != null && filters.minSpend !== '') {
    where.push(`br.total_amount >= $${idx++}`);
    params.push(Number(filters.minSpend));
  }
  if (filters.maxSpend != null && filters.maxSpend !== '') {
    where.push(`br.total_amount <= $${idx++}`);
    params.push(Number(filters.maxSpend));
  }

  const q = `
    SELECT br.id, br.merchant_name, br.billed_at, br.location_text, br.subtotal, br.tax_amount, br.total_amount, br.created_at,
           COUNT(bi.id)::int AS item_count
    FROM bill_records br
    LEFT JOIN bill_items bi ON bi.bill_id = br.id
    WHERE ${where.join(' AND ')}
    GROUP BY br.id
    ORDER BY COALESCE(br.billed_at, br.created_at) DESC
  `;
  const r = await getPool().query(q, params);
  return r.rows;
}

async function getBillDetail(userId, billId) {
  const header = await getPool().query(
    `SELECT id, merchant_name, billed_at, location_text, subtotal, tax_amount, total_amount, created_at
     FROM bill_records
     WHERE id = $1 AND user_id = $2`,
    [billId, userId]
  );
  if (!header.rows[0]) return null;
  const items = await getPool().query(
    `SELECT id, pantry_item_id, raw_name, normalized_name, category, quantity, unit,
            unit_price, line_subtotal, line_tax, line_total, estimated_tax_rate
     FROM bill_items
     WHERE bill_id = $1
     ORDER BY created_at ASC`,
    [billId]
  );
  return { ...header.rows[0], items: items.rows };
}

async function deleteBillByUser(userId, billId) {
  const r = await getPool().query(
    `DELETE FROM bill_records
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [billId, userId]
  );
  return !!r.rows[0];
}

async function updateBillByUser(userId, billId, body = {}) {
  const merchantName = body.merchant_name != null ? String(body.merchant_name).trim() : null;
  const locationText = body.location_text != null ? String(body.location_text).trim() : null;
  const billedAtRaw = body.billed_at != null ? String(body.billed_at).trim() : null;
  const billedAtDate = billedAtRaw ? new Date(billedAtRaw) : null;
  const billedAt = billedAtDate && !Number.isNaN(billedAtDate.getTime()) ? billedAtDate.toISOString() : null;
  const subtotal = body.subtotal != null ? toMoney(body.subtotal, 0) : null;
  const taxAmount = body.tax_amount != null ? toMoney(body.tax_amount, 0) : null;
  const totalAmount = body.total_amount != null ? toMoney(body.total_amount, 0) : null;

  const current = await getPool().query(
    `SELECT id, merchant_name, billed_at, location_text, subtotal, tax_amount, total_amount
     FROM bill_records
     WHERE id = $1 AND user_id = $2`,
    [billId, userId]
  );
  if (!current.rows[0]) return null;
  const cur = current.rows[0];

  const nextSubtotal = subtotal != null ? subtotal : toMoney(cur.subtotal, 0);
  const nextTax = taxAmount != null ? taxAmount : toMoney(cur.tax_amount, 0);
  const nextTotal = totalAmount != null ? totalAmount : toMoney(nextSubtotal + nextTax, 0);

  const updated = await getPool().query(
    `UPDATE bill_records
     SET merchant_name = $1,
         billed_at = $2,
         location_text = $3,
         subtotal = $4,
         tax_amount = $5,
         total_amount = $6
     WHERE id = $7 AND user_id = $8
     RETURNING id, merchant_name, billed_at, location_text, subtotal, tax_amount, total_amount, created_at`,
    [
      merchantName || cur.merchant_name,
      billedAt || cur.billed_at || new Date().toISOString(),
      locationText != null ? locationText : cur.location_text,
      nextSubtotal,
      nextTax,
      nextTotal,
      billId,
      userId,
    ]
  );
  return updated.rows[0];
}

function buildReportWhere(userId, filters = {}) {
  const where = ['br.user_id = $1'];
  const params = [userId];
  let idx = 2;
  if (filters.company) {
    where.push(`lower(br.merchant_name) LIKE $${idx++}`);
    params.push(`%${String(filters.company).trim().toLowerCase()}%`);
  }
  if (filters.product) {
    where.push(`lower(coalesce(bi.normalized_name, bi.raw_name)) LIKE $${idx++}`);
    params.push(`%${String(filters.product).trim().toLowerCase()}%`);
  }
  if (filters.year) {
    where.push(`EXTRACT(YEAR FROM br.billed_at) = $${idx++}`);
    params.push(Number(filters.year));
  }
  if (filters.month) {
    where.push(`EXTRACT(MONTH FROM br.billed_at) = $${idx++}`);
    params.push(Number(filters.month));
  }
  if (filters.date) {
    where.push(`date(br.billed_at) = $${idx++}`);
    params.push(filters.date);
  }
  if (filters.fromDate) {
    where.push(`date(br.billed_at) >= $${idx++}`);
    params.push(filters.fromDate);
  }
  if (filters.toDate) {
    where.push(`date(br.billed_at) <= $${idx++}`);
    params.push(filters.toDate);
  }
  return { where, params };
}

async function getBillsReport(userId, filters = {}) {
  const pool = getPool();
  const { where, params } = buildReportWhere(userId, filters);

  const totals = await pool.query(
    `SELECT COUNT(DISTINCT br.id)::int AS bills_count,
            COALESCE(SUM(DISTINCT br.total_amount), 0) AS total_spend,
            COALESCE(SUM(DISTINCT br.tax_amount), 0) AS total_tax
     FROM bill_records br
     LEFT JOIN bill_items bi ON bi.bill_id = br.id
     WHERE ${where.join(' AND ')}`,
    params
  );

  const merchantSpend = await pool.query(
    `SELECT br.merchant_name, COALESCE(SUM(br.total_amount), 0) AS spend
     FROM bill_records br
     LEFT JOIN bill_items bi ON bi.bill_id = br.id
     WHERE ${where.join(' AND ')}
     GROUP BY br.merchant_name
     ORDER BY spend DESC
     LIMIT 10`,
    params
  );

  const topProductsByQty = await pool.query(
    `SELECT COALESCE(bi.normalized_name, bi.raw_name) AS product,
            COALESCE(SUM(bi.quantity), 0) AS qty
     FROM bill_records br
     JOIN bill_items bi ON bi.bill_id = br.id
     WHERE ${where.join(' AND ')}
     GROUP BY COALESCE(bi.normalized_name, bi.raw_name)
     ORDER BY qty DESC
     LIMIT 10`,
    params
  );

  const productPriceRows = await pool.query(
    `SELECT COALESCE(bi.normalized_name, bi.raw_name) AS product,
            br.merchant_name,
            bi.unit_price,
            bi.quantity,
            br.billed_at
     FROM bill_records br
     JOIN bill_items bi ON bi.bill_id = br.id
     WHERE ${where.join(' AND ')}
       AND bi.unit_price IS NOT NULL
     ORDER BY br.billed_at DESC`,
    params
  );

  const cheapestByProduct = {};
  const purchaseHistory = [];
  for (const row of productPriceRows.rows) {
    const product = String(row.product || 'Item');
    const price = Number(row.unit_price || 0);
    purchaseHistory.push({
      product,
      merchant_name: row.merchant_name,
      unit_price: price,
      quantity: Number(row.quantity || 0),
      billed_at: row.billed_at,
    });
    if (!cheapestByProduct[product] || price < cheapestByProduct[product].min_unit_price) {
      cheapestByProduct[product] = {
        product,
        min_unit_price: price,
        merchant_name: row.merchant_name,
      };
    }
  }

  return {
    totals: totals.rows[0] || { bills_count: 0, total_spend: 0, total_tax: 0 },
    merchant_spend: merchantSpend.rows,
    top_products_by_qty: topProductsByQty.rows,
    cheapest_by_product: Object.values(cheapestByProduct).slice(0, 20),
    purchase_history: purchaseHistory.slice(0, 200),
  };
}

async function revertLatestBillByUser(userId) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const latest = await client.query(
      `SELECT id
       FROM bill_records
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );
    const billId = latest.rows[0]?.id;
    if (!billId) {
      await client.query('ROLLBACK');
      return null;
    }

    const rows = await client.query(
      `SELECT bi.pantry_item_id,
              COALESCE(bi.quantity, 0) AS bill_qty,
              COALESCE(bi.normalized_name, bi.raw_name) AS bill_name,
              COALESCE(bi.unit, 'pcs') AS bill_unit
       FROM bill_items bi
       WHERE bi.bill_id = $1
      `,
      [billId]
    );

    let adjustedCount = 0;
    for (const r of rows.rows) {
      let pantryItemId = r.pantry_item_id;
      const billQty = Number(r.bill_qty || 0);
      const billName = String(r.bill_name || '').trim();
      const billUnit = String(r.bill_unit || 'pcs');
      if (billQty <= 0) continue;

      let pantry = await client.query(
        `SELECT id, quantity
         FROM kitchen_items
         WHERE id = $1 AND user_id = $2
         FOR UPDATE`,
        [pantryItemId, userId]
      );
      let cur = pantry.rows[0];

      // Fallback: if link is missing/stale, match by item name + unit.
      if (!cur && billName) {
        const fallback = await client.query(
          `SELECT id, quantity
           FROM kitchen_items
           WHERE user_id = $1
             AND lower(trim(custom_name)) = lower(trim($2))
             AND unit = $3
           ORDER BY updated_at DESC
           LIMIT 1
           FOR UPDATE`,
          [userId, billName, billUnit]
        );
        cur = fallback.rows[0];
        pantryItemId = cur?.id || pantryItemId;
      }

      if (!cur) continue;
      const currentQty = Number(cur.quantity || 0);
      const nextQty = currentQty - billQty;
      if (nextQty <= 0) {
        await client.query(`DELETE FROM kitchen_items WHERE id = $1 AND user_id = $2`, [pantryItemId, userId]);
      } else {
        await client.query(`UPDATE kitchen_items SET quantity = $1 WHERE id = $2 AND user_id = $3`, [nextQty, pantryItemId, userId]);
      }
      adjustedCount += 1;
    }

    await client.query(`DELETE FROM bill_records WHERE id = $1 AND user_id = $2`, [billId, userId]);
    await client.query('COMMIT');
    return { reverted_bill_id: billId, adjusted_items: adjustedCount };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  saveBillAndPantryItems,
  listBillsByUser,
  getBillDetail,
  deleteBillByUser,
  updateBillByUser,
  getBillsReport,
  revertLatestBillByUser,
};
