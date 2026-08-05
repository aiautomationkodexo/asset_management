-- Round out the asset category list beyond the original 3 demo categories
-- (Laptop/LT, Monitor/MN, Office Chair/CH from supabase/seed.sql) to cover
-- the full set of hardware and furniture IT tracks. tag_prefix drives
-- generate_asset_tag() and is scoped per (category_prefix, year) in
-- tag_sequences, so each of these gets its own independent tag sequence.

INSERT INTO asset_categories (name, tag_prefix, is_depreciable, default_useful_life_months, is_physical)
VALUES
  ('Desktop Computer', 'DT', true, 36, true),
  ('Mobile Phone', 'PH', true, 24, true),
  ('Tablet', 'TB', true, 24, true),
  ('Printer / Scanner', 'PR', true, 48, true),
  ('Networking Equipment', 'NW', true, 60, true),
  ('Office Desk', 'DK', true, 84, true),
  ('Keyboard', 'KB', true, 24, true),
  ('Mouse', 'MS', true, 24, true),
  ('Headset', 'HS', true, 24, true)
ON CONFLICT (tag_prefix) DO NOTHING;
