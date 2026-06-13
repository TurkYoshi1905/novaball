-- NovaBall: custom_rooms tablosundan ranked kolonu kaldır
-- Özel odalar her zaman serbest moddur (RP kazanılmaz).
-- Bu SQL'i Supabase → SQL Editor'da çalıştır

ALTER TABLE custom_rooms
  DROP COLUMN IF EXISTS ranked;
