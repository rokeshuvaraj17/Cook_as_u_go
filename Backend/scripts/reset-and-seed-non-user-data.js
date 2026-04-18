/**
 * Keep app_users, wipe other pantry tables, and seed demo data.
 * Run: npm run db:reset:seed
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');

function needsSsl(url) {
  return (
    url.includes('supabase') ||
    url.includes('sslmode=require') ||
    process.env.DATABASE_SSL === 'true'
  );
}

const UNIT_ROWS = [
  ['g', 'weight', 1, 'grams'],
  ['kg', 'weight', 1000, 'kilograms'],
  ['ml', 'volume', 1, 'milliliters'],
  ['L', 'volume', 1000, 'liters'],
  ['pcs', 'count', null, 'pieces'],
  ['pack', 'count', null, 'pack'],
  ['bowl', 'count', null, 'bowl'],
  ['tub', 'count', null, 'tub'],
  ['bag', 'count', null, 'bag'],
  ['container', 'count', null, 'container'],
  ['loaf', 'count', null, 'loaf'],
];

const INGREDIENT_ROWS = [
  { name: 'Tomato', category: 'vegetable', defaultUnit: 'pcs', isLiquid: false, alias: 'tomatoes' },
  { name: 'Onion', category: 'vegetable', defaultUnit: 'pcs', isLiquid: false, alias: 'onions' },
  { name: 'Potato', category: 'vegetable', defaultUnit: 'pcs', isLiquid: false, alias: 'potatoes' },
  { name: 'Egg', category: 'dairy', defaultUnit: 'pcs', isLiquid: false, alias: 'eggs' },
  { name: 'Milk', category: 'dairy', defaultUnit: 'ml', isLiquid: true, alias: 'whole milk' },
  { name: 'Rice', category: 'grain', defaultUnit: 'g', isLiquid: false, alias: 'white rice' },
  { name: 'Chicken', category: 'meat', defaultUnit: 'g', isLiquid: false, alias: 'chicken meat' },
  { name: 'Salt', category: 'spice', defaultUnit: 'g', isLiquid: false, alias: 'table salt' },
  { name: 'Oil', category: 'spice', defaultUnit: 'ml', isLiquid: true, alias: 'cooking oil' },
  { name: 'Bread', category: 'bakery', defaultUnit: 'loaf', isLiquid: false, alias: 'bread loaf' },
];

const KITCHEN_ITEM_TEMPLATES = [
  { ingredient: 'Tomato', quantity: 6, unit: 'pcs', step: 1, note: 'Fridge drawer' },
  { ingredient: 'Onion', quantity: 4, unit: 'pcs', step: 1, note: 'Pantry basket' },
  { ingredient: 'Potato', quantity: 8, unit: 'pcs', step: 1, note: 'Cool shelf' },
  { ingredient: 'Egg', quantity: 12, unit: 'pcs', step: 1, note: 'Egg tray' },
  { ingredient: 'Milk', quantity: 1.5, unit: 'L', step: 0.25, note: 'Dairy section' },
  { ingredient: 'Rice', quantity: 2, unit: 'kg', step: 0.25, note: 'Airtight jar' },
  { ingredient: 'Chicken', quantity: 900, unit: 'g', step: 100, note: 'Freezer pack' },
  { ingredient: 'Salt', quantity: 750, unit: 'g', step: 50, note: 'Spice rack' },
  { ingredient: 'Oil', quantity: 2, unit: 'L', step: 0.25, note: 'Cooking shelf' },
  { ingredient: 'Bread', quantity: 1, unit: 'loaf', step: 1, note: 'Counter basket' },
];

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('Missing DIRECT_URL or DATABASE_URL in .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl: needsSsl(url) ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    await client.query('BEGIN');

    const usersResult = await client.query(
      'SELECT id, email, name FROM app_users ORDER BY created_at ASC'
    );
    const users = usersResult.rows;
    if (users.length === 0) {
      throw new Error('No users found in app_users. Create at least one user, then re-run.');
    }

    // Keep app_users as requested; wipe all dependent pantry tables.
    await client.query(
      'TRUNCATE TABLE kitchen_items, ingredient_aliases, ingredients_master, units RESTART IDENTITY'
    );

    for (const [code, type, conversion, label] of UNIT_ROWS) {
      await client.query(
        `INSERT INTO units (code, type, conversion_to_base, display_label)
         VALUES ($1, $2, $3, $4)`,
        [code, type, conversion, label]
      );
    }

    for (const row of INGREDIENT_ROWS) {
      await client.query(
        `INSERT INTO ingredients_master (name, category, default_unit, is_liquid)
         VALUES ($1, $2, $3, $4)`,
        [row.name, row.category, row.defaultUnit, row.isLiquid]
      );
    }

    const ingredientsResult = await client.query(
      'SELECT id, name FROM ingredients_master WHERE name = ANY($1::text[])',
      [INGREDIENT_ROWS.map((r) => r.name)]
    );
    const ingredientIdByName = new Map(ingredientsResult.rows.map((r) => [r.name, r.id]));

    for (const row of INGREDIENT_ROWS) {
      const ingredientId = ingredientIdByName.get(row.name);
      if (!ingredientId) continue;
      await client.query(
        'INSERT INTO ingredient_aliases (ingredient_id, alias) VALUES ($1, $2)',
        [ingredientId, row.alias]
      );
    }

    for (const user of users) {
      for (const item of KITCHEN_ITEM_TEMPLATES) {
        const ingredientId = ingredientIdByName.get(item.ingredient);
        if (!ingredientId) continue;
        await client.query(
          `INSERT INTO kitchen_items (
             user_id, ingredient_id, custom_name, quantity, unit, step, note
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [user.id, ingredientId, item.ingredient, item.quantity, item.unit, item.step, item.note]
        );
      }
    }

    await client.query('COMMIT');
    console.log(`Done. Kept app_users (${users.length} user(s)).`);
    console.log(
      `Seeded: ${UNIT_ROWS.length} units, ${INGREDIENT_ROWS.length} ingredients, ` +
        `${INGREDIENT_ROWS.length} aliases, ${KITCHEN_ITEM_TEMPLATES.length * users.length} kitchen_items.`
    );
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
