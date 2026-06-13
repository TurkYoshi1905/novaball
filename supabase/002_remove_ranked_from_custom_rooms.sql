-- NovaBall: custom_rooms tablosundan ranked kolonu kaldır
-- Özel odalar her zaman serbest moddadır (ranked: false).
-- Bu SQL'i Supabase → SQL Editor'da çalıştır.

-- ranked kolonu varsa kaldır (yoksa hata vermez)
ALTER TABLE custom_rooms
  DROP COLUMN IF EXISTS ranked;

-- Doğrulama: tablonun mevcut kolonlarını listele
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'custom_rooms'
-- ORDER BY ordinal_position;
