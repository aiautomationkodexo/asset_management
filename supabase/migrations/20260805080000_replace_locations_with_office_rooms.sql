-- Replace the placeholder desk/reception/store locations with the actual
-- company room list. Assets pointing at a removed location are unassigned
-- (location_id set to NULL) rather than deleted — custody history stays,
-- the room just needs to be re-picked in the UI.

UPDATE assets SET location_id = NULL
WHERE location_id IN (
  SELECT id FROM locations WHERE name IN ('Floor 2 — Dev Bay', 'Floor 1 — Reception', 'IT Store Room')
);

DELETE FROM locations WHERE name IN ('Floor 2 — Dev Bay', 'Floor 1 — Reception', 'IT Store Room');

INSERT INTO locations (name, type) VALUES
  ('Executive Room', 'room'),
  ('HR Room', 'room'),
  ('Dev Lounge', 'room'),
  ('Engineering Room', 'room'),
  ('Sales Room', 'room'),
  ('Marketing Room', 'room'),
  ('AI Automation Room', 'room');
