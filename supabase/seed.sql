-- ============================================================
-- SEED: Datos de prueba para desarrollo local
-- Se ejecuta automáticamente con: supabase db reset
-- ============================================================

-- Nota: Los usuarios auth los crea el script scripts/seed.ts
-- Este seed solo inserta datos que no dependen de auth.users

-- Insertar jugadores de prueba (sin profile vinculado, los crea el admin)
INSERT INTO players (id, display_name, phone) VALUES
  ('11111111-0001-0001-0001-000000000001', 'Carlos García', null),
  ('11111111-0001-0001-0001-000000000002', 'Ana Martínez', null),
  ('11111111-0001-0001-0001-000000000003', 'Luis Rodríguez', null),
  ('11111111-0001-0001-0001-000000000004', 'María López', null),
  ('11111111-0001-0001-0001-000000000005', 'Pedro Sánchez', null),
  ('11111111-0001-0001-0001-000000000006', 'Laura Fernández', null),
  ('11111111-0001-0001-0002-000000000001', 'Miguel Torres', null),
  ('11111111-0001-0001-0002-000000000002', 'Elena Díaz', null),
  ('11111111-0001-0001-0002-000000000003', 'Antonio Ruiz', null),
  ('11111111-0001-0001-0002-000000000004', 'Carmen Jiménez', null),
  ('11111111-0001-0001-0002-000000000005', 'Francisco Moreno', null),
  ('11111111-0001-0001-0002-000000000006', 'Isabel Navarro', null)
ON CONFLICT (id) DO NOTHING;
