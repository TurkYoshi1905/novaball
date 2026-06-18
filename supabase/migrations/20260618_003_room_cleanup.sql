-- ============================================================
-- NovaBall v0.1.1 — Özel Oda Temizleme & Host Ayrılma Desteği
-- Dosya: 20260618_003_room_cleanup.sql
-- Supabase SQL Editor'da çalıştır
-- ============================================================

-- ── Mevcut RPC'leri güncelle ────────────────────────────────────────────────

-- room_leave: oyuncu odadan ayrılınca çağrılır.
-- Eğer ayrılan host ise oda tamamen silinir (cascade ile ilgili kayıtlar da temizlenir).
-- Eğer normal üye ise sadece kendi kaydı teams json'dan çıkarılır.
CREATE OR REPLACE FUNCTION room_leave(p_room_id uuid, p_username text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host text;
  v_red  jsonb;
  v_blue jsonb;
BEGIN
  SELECT host_username, red_team, blue_team
    INTO v_host, v_red, v_blue
    FROM custom_rooms
   WHERE id = p_room_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Host ayrılıyorsa odayı tamamen sil
  IF v_host = p_username THEN
    DELETE FROM custom_rooms WHERE id = p_room_id;
    RETURN;
  END IF;

  -- Normal üye: kendi kaydını teams'ten çıkar
  v_red  := COALESCE(
    (SELECT jsonb_agg(m) FROM jsonb_array_elements(v_red)  m WHERE m->>'username' <> p_username),
    '[]'::jsonb
  );
  v_blue := COALESCE(
    (SELECT jsonb_agg(m) FROM jsonb_array_elements(v_blue) m WHERE m->>'username' <> p_username),
    '[]'::jsonb
  );

  UPDATE custom_rooms
     SET red_team  = v_red,
         blue_team = v_blue
   WHERE id = p_room_id;
END;
$$;

-- ── Sahipsiz oda temizleme fonksiyonu ────────────────────────────────────────
-- Oyuncular maç sırasında bağlantısı kesilebilir. Bu fonksiyon 10 dakikadan
-- eski "playing" statüsündeki odaları temizler.
-- Supabase'de pg_cron ile periyodik çalıştırılabilir:
--   SELECT cron.schedule('cleanup-stale-rooms', '*/10 * * * *',
--     $$SELECT cleanup_stale_rooms()$$);
--
-- Return type değiştiği için önce düşürüyoruz (CREATE OR REPLACE bunu yapamaz)
DROP FUNCTION IF EXISTS cleanup_stale_rooms();
CREATE OR REPLACE FUNCTION cleanup_stale_rooms()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM custom_rooms
   WHERE status = 'playing'
     AND created_at < NOW() - INTERVAL '10 minutes'
  RETURNING 1 INTO v_deleted;

  RETURN COALESCE(v_deleted, 0);
END;
$$;

-- ── Oda silme yetkisi: sadece host veya oyuncu kendisi silebilir ─────────────
-- Bu policy custom_rooms tablosundaki RLS'i güçlendirir.
-- Önce mevcut policy'yi düşür, sonra yeniden oluştur.
DROP POLICY IF EXISTS "Host can delete room" ON custom_rooms;

CREATE POLICY "Host can delete room"
  ON custom_rooms FOR DELETE
  USING (
    host_username = (SELECT username FROM players WHERE id = auth.uid())
  );

-- ── İndeks: eski odaları hızlı bulmak için ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_custom_rooms_status_created
  ON custom_rooms (status, created_at);
