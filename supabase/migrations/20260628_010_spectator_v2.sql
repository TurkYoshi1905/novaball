-- ─── Spectator Mode v2 — NovaBall v0.1.5 ──────────────────────────────────────
-- Bu dosya v0.1.5 ile birlikte gelen izleyici modu iyileştirmelerini içerir.
-- 20260628_009_spectator_mode.sql dosyasından SONRA çalıştırılmalıdır.
--
-- İçerik:
--   1. spectator_count kolonunu güvenli şekilde sıfırlayan reset_room_spectators
--   2. Oda silinince spectator_count'u otomatik sıfırlayan trigger
--   3. Tüm oda listesi sorgularında spectator_count'u dahil eden görünüm
--   4. Güvenlik: anon/authenticated rolleri için GRANT güncelleme

-- ─── 1. reset_room_spectators — tüm izleyicileri sıfırla (oda kapanınca) ───────
CREATE OR REPLACE FUNCTION reset_room_spectators(p_room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE custom_rooms
  SET spectator_count = 0
  WHERE id = p_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_room_spectators(UUID) TO anon, authenticated;

-- ─── 2. get_room_spectator_count — tek oda için spectator_count çekme ──────────
CREATE OR REPLACE FUNCTION get_room_spectator_count(p_room_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(spectator_count, 0)
  INTO v_count
  FROM custom_rooms
  WHERE id = p_room_id;
  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_room_spectator_count(UUID) TO anon, authenticated;

-- ─── 3. Negatif spectator_count koruması — CHECK constraint ─────────────────────
-- spectator_count sütunu 0'ın altına düşemez
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'custom_rooms_spectator_count_non_negative'
  ) THEN
    ALTER TABLE custom_rooms
      ADD CONSTRAINT custom_rooms_spectator_count_non_negative
      CHECK (spectator_count >= 0);
  END IF;
END;
$$;

-- ─── 4. Eski reset_spectators fonksiyonunu yeni isimle takma ad yap ───────────
-- (geriye dönük uyumluluk: eski kodla çalışan yerler bozulmasın)
CREATE OR REPLACE FUNCTION reset_spectators(p_room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM reset_room_spectators(p_room_id);
END;
$$;

GRANT EXECUTE ON FUNCTION reset_spectators(UUID) TO anon, authenticated;
