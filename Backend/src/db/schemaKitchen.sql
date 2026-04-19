-- Kitchen / pantry schema aligned with the mobile app (amount + unit codes).
-- Uses gen_random_uuid() (PostgreSQL 13+) — no uuid-ossp required.
-- Indexes: composite (user_id, updated_at DESC) for typical "my pantry" list (PostgreSQL multicolumn index guidance).

CREATE TABLE IF NOT EXISTS ingredients_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  default_unit TEXT,
  is_liquid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS units (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  conversion_to_base NUMERIC,
  display_label TEXT
);

CREATE TABLE IF NOT EXISTS ingredient_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES ingredients_master (id) ON DELETE CASCADE,
  alias TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_ingredient ON ingredient_aliases (ingredient_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_alias_lower ON ingredient_aliases (lower(alias));

CREATE TABLE IF NOT EXISTS kitchen_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients_master (id) ON DELETE SET NULL,
  custom_name TEXT,
  quantity NUMERIC NOT NULL CHECK (quantity >= 0),
  unit TEXT NOT NULL REFERENCES units (code),
  step NUMERIC CHECK (step IS NULL OR step > 0),
  note TEXT NOT NULL DEFAULT '',
  weight_grams NUMERIC,
  expiry_date DATE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kitchen_items_name_chk CHECK (
    ingredient_id IS NOT NULL
    OR (custom_name IS NOT NULL AND length(trim(custom_name)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_kitchen_items_user_updated ON kitchen_items (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_kitchen_items_user ON kitchen_items (user_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_items_ingredient ON kitchen_items (ingredient_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_items_available ON kitchen_items (user_id) WHERE is_available = TRUE;

CREATE TABLE IF NOT EXISTS bill_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  merchant_name TEXT NOT NULL,
  billed_at TIMESTAMPTZ,
  location_text TEXT,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'scan',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bill_records_user_created ON bill_records (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bill_records (id) ON DELETE CASCADE,
  pantry_item_id UUID REFERENCES kitchen_items (id) ON DELETE SET NULL,
  raw_name TEXT NOT NULL,
  normalized_name TEXT,
  category TEXT,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'pcs',
  unit_price NUMERIC(12, 2),
  line_subtotal NUMERIC(12, 2),
  line_tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12, 2),
  estimated_tax_rate NUMERIC(8, 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items (bill_id);

CREATE TABLE IF NOT EXISTS user_api_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  api_type TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  base_url TEXT NOT NULL,
  api_key TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_api_settings ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE user_api_settings ADD COLUMN IF NOT EXISTS model TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_api_settings_api_type_check'
  ) THEN
    ALTER TABLE user_api_settings DROP CONSTRAINT user_api_settings_api_type_check;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_api_settings_user_type ON user_api_settings (user_id, api_type, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_api_settings_default_per_type
  ON user_api_settings (user_id, api_type)
  WHERE is_default = TRUE;

CREATE OR REPLACE FUNCTION kitchen_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PostgreSQL 14+: EXECUTE FUNCTION; older versions use EXECUTE PROCEDURE (equivalent for plpgsql triggers).
DROP TRIGGER IF EXISTS kitchen_items_set_updated_at ON kitchen_items;
CREATE TRIGGER kitchen_items_set_updated_at
  BEFORE UPDATE ON kitchen_items
  FOR EACH ROW
  EXECUTE FUNCTION kitchen_set_updated_at();

DROP TRIGGER IF EXISTS user_api_settings_set_updated_at ON user_api_settings;
CREATE TRIGGER user_api_settings_set_updated_at
  BEFORE UPDATE ON user_api_settings
  FOR EACH ROW
  EXECUTE FUNCTION kitchen_set_updated_at();

INSERT INTO units (code, type, conversion_to_base, display_label) VALUES
  ('g', 'weight', 1, 'grams'),
  ('kg', 'weight', 1000, 'kilograms'),
  ('lb', 'weight', 453.592, 'pounds'),
  ('ml', 'volume', 1, 'milliliters'),
  ('L', 'volume', 1000, 'liters'),
  ('pcs', 'count', NULL, 'pieces'),
  ('pack', 'count', NULL, 'pack'),
  ('bowl', 'count', NULL, 'bowl'),
  ('tub', 'count', NULL, 'tub'),
  ('bag', 'count', NULL, 'bag'),
  ('container', 'count', NULL, 'container'),
  ('loaf', 'count', NULL, 'loaf')
ON CONFLICT (code) DO NOTHING;

INSERT INTO ingredients_master (name, category, default_unit, is_liquid) VALUES
  ('Tomato', 'vegetable', 'pcs', FALSE),
  ('Onion', 'vegetable', 'pcs', FALSE),
  ('Egg', 'dairy', 'pcs', FALSE),
  ('Milk', 'dairy', 'ml', TRUE),
  ('Rice', 'grain', 'g', FALSE),
  ('Chicken', 'meat', 'g', FALSE),
  ('Salt', 'spice', 'g', FALSE),
  ('Oil', 'spice', 'ml', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_id, alias)
SELECT id, 'tomatoes' FROM ingredients_master WHERE name = 'Tomato'
AND NOT EXISTS (
  SELECT 1 FROM ingredient_aliases ia
  JOIN ingredients_master im ON im.id = ia.ingredient_id
  WHERE im.name = 'Tomato' AND lower(ia.alias) = 'tomatoes'
);

INSERT INTO ingredient_aliases (ingredient_id, alias)
SELECT id, 'eggs' FROM ingredients_master WHERE name = 'Egg'
AND NOT EXISTS (
  SELECT 1 FROM ingredient_aliases ia
  JOIN ingredients_master im ON im.id = ia.ingredient_id
  WHERE im.name = 'Egg' AND lower(ia.alias) = 'eggs'
);

INSERT INTO ingredient_aliases (ingredient_id, alias)
SELECT id, 'chicken meat' FROM ingredients_master WHERE name = 'Chicken'
AND NOT EXISTS (
  SELECT 1 FROM ingredient_aliases ia
  JOIN ingredients_master im ON im.id = ia.ingredient_id
  WHERE im.name = 'Chicken' AND lower(ia.alias) = 'chicken meat'
);
