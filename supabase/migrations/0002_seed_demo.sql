-- =====================================================================
-- Votepaddie - DEMO polling-unit seed
-- Run AFTER 0001_init.sql. These are FAKE demo records (codes start with DM-),
-- NOT INEC data. Replace with real INEC data before any real-world use.
-- Coordinates are approximate Abuja-area points so the map/geofence demo has something to use.
-- =====================================================================

insert into public.polling_units (code, name, state_code, state_name, lga_code, lga_name, ward_code, ward_name, lat, lng) values
  -- Ward 01: Garki (Demo)
  ('DM-01-01-001', 'DEMO Primary School Garki I',        'DM', 'FCT (Demo)', '01', 'AMAC (Demo)', '01', 'Garki Ward (Demo)',  9.0397, 7.4905),
  ('DM-01-01-002', 'DEMO Primary School Garki II',       'DM', 'FCT (Demo)', '01', 'AMAC (Demo)', '01', 'Garki Ward (Demo)',  9.0401, 7.4912),
  ('DM-01-01-003', 'DEMO Health Centre Garki',           'DM', 'FCT (Demo)', '01', 'AMAC (Demo)', '01', 'Garki Ward (Demo)',  9.0388, 7.4896),
  ('DM-01-01-004', 'DEMO Market Square Garki',           'DM', 'FCT (Demo)', '01', 'AMAC (Demo)', '01', 'Garki Ward (Demo)',  null,   null),   -- no coordinates: tests manual-confirm fallback
  -- Ward 02: Wuse (Demo)
  ('DM-01-02-001', 'DEMO Secondary School Wuse I',       'DM', 'FCT (Demo)', '01', 'AMAC (Demo)', '02', 'Wuse Ward (Demo)',   9.0667, 7.4667),
  ('DM-01-02-002', 'DEMO Community Hall Wuse',           'DM', 'FCT (Demo)', '01', 'AMAC (Demo)', '02', 'Wuse Ward (Demo)',   9.0674, 7.4672),
  ('DM-01-02-003', 'DEMO Primary School Wuse',           'DM', 'FCT (Demo)', '01', 'AMAC (Demo)', '02', 'Wuse Ward (Demo)',   9.0659, 7.4660),
  ('DM-01-02-004', 'DEMO Church Hall Wuse',              'DM', 'FCT (Demo)', '01', 'AMAC (Demo)', '02', 'Wuse Ward (Demo)',   9.0681, 7.4679),
  -- Ward 03: Maitama (Demo)
  ('DM-01-03-001', 'DEMO Primary School Maitama',        'DM', 'FCT (Demo)', '01', 'AMAC (Demo)', '03', 'Maitama Ward (Demo)', 9.0870, 7.4980),
  ('DM-01-03-002', 'DEMO Town Hall Maitama',             'DM', 'FCT (Demo)', '01', 'AMAC (Demo)', '03', 'Maitama Ward (Demo)', 9.0877, 7.4986),
  ('DM-01-03-003', 'DEMO Clinic Maitama',                'DM', 'FCT (Demo)', '01', 'AMAC (Demo)', '03', 'Maitama Ward (Demo)', 9.0862, 7.4973),
  ('DM-01-03-004', 'DEMO Secondary School Maitama',      'DM', 'FCT (Demo)', '01', 'AMAC (Demo)', '03', 'Maitama Ward (Demo)', 9.0884, 7.4993)
on conflict (code) do nothing;

select public.refresh_wards();

-- ---------------------------------------------------------------------
-- Testing the geofence from where YOU are (so "Join line" verifies on your phone):
-- move one demo unit to your current coordinates, e.g.
--   update public.polling_units set lat = 9.0765, lng = 7.3986 where code = 'DM-01-01-001';
-- (Get your coordinates from Google Maps: long-press a spot, copy the numbers.)
-- ---------------------------------------------------------------------
