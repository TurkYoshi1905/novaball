-- ─── Spectator Mode (Birleştirilmiş) — NovaBall v0.1.5 ────────────────────────
-- custom_rooms tablosuna spectator_count kolonu ekler; izleyici sayısını yönetmek
-- için SECURITY DEFINER RPC'leri tanımlar; negatif sayaç koruması sağlar.
--
-- Bu tek dosya aşağıdakilerin eksiksiz birleşimidir:
--   • orijinal spectator_mode migrasyonu  (spectator_count kolonu + join/leave/reset)
--   • v0.1.5 iyileştirmeleri              (reset_room_spectators, get_room_spectator_count,
--                                          negatif CHECK constraint, geriye dönük takma ad)
--
-- Çalıştırma: master şema (001) çalıştırıldıktan SONRA bu dosyayı çalıştır.
-- Tekrar çalıştırılabilir (idempotent) — CREATE OR REPLACE ve IF NOT EXISTS kullanılır.

-- ─── 1. spectator_count kolonu ───────────────────────────────────────────────
ALTER TABLE custom_rooms
  ADD COLUMN IF NOT EXISTS spectator_count INTEGER NOT NULL DEFAULT 0;

-- ─── 2. Negatif sayaç koruması — CHECK constraint ─────────────────────────────
-- spectator_count hiçbir zaman 0'ın altına düşemez.
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

-- ─── 3. spectator_join — izleyici odaya katılınca sayacı 1 artırır ────────────
-- Yalnızca 'waiting' veya 'playing' durumdaki odalarda çalışır.
-- GREATEST(0, ...) ile sayaç hiçbir zaman negatife düşmez.
CREATE OR REPLACE FUNCTION spectator_join(p_room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE custom_rooms
  SET spectator_count = GREATEST(0, COALESCE(spectator_count, 0) + 1)
  WHERE id = p_room_id
    AND status IN ('waiting', 'playing');
END;
$$;

-- ─── 4. spectator_leave — izleyici ayrılınca sayacı 1 azaltır ────────────────
-- GREATEST(0, ...) ile sayaç 0'ın altına düşmez.
CREATE OR REPLACE FUNCTION spectator_leave(p_room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE custom_rooms
  SET spectator_count = GREATEST(0, COALESCE(spectator_count, 0) - 1)
  WHERE id = p_room_id;
END;
$$;

-- ─── 5. reset_room_spectators — oda kapanınca sayacı sıfırlar ────────────────
-- room_leave RPC'den ve oda silinmeden önce çağrılır.
-- Bu birincil sıfırlama fonksiyonudur.
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

-- ─── 6. reset_spectators — geriye dönük uyumluluk takma adı ──────────────────
-- Eski kod reset_spectators() çağırıyorsa bozulmasın diye korunur.
-- Dahili olarak reset_room_spectators()'ı çağırır.
CREATE OR REPLACE FUNCTION reset_spectators(p_room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM reset_room_spectators(p_room_id);
END;
$$;

-- ─── 7. get_room_spectator_count — tek oda için sayacı sorgula ───────────────
-- Oda bulunamazsa 0 döndürür (NULL güvencesi).
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

-- ─── 8. İzinler — anon ve authenticated rolleri tüm RPC'leri çağırabilir ──────
GRANT EXECUTE ON FUNCTION spectator_join(UUID)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION spectator_leave(UUID)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_room_spectators(UUID)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_spectators(UUID)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_room_spectator_count(UUID) TO anon, authenticated;
