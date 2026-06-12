-- NovaBall: Ranked multiplayer & forfeit support
-- Bu SQL'i Supabase → SQL Editor'da çalıştır

-- ─── active_matches tablosuna ranked kolonu ekle ────────────────────────────
ALTER TABLE active_matches
  ADD COLUMN IF NOT EXISTS ranked boolean DEFAULT true;

-- Mevcut maçları ranked yap
UPDATE active_matches SET ranked = true WHERE ranked IS NULL;

-- ─── custom_rooms tablosuna ranked kolonu ekle ──────────────────────────────
ALTER TABLE custom_rooms
  ADD COLUMN IF NOT EXISTS ranked boolean DEFAULT false;

-- ─── matchmaking_queue: zaman damgası indeksi ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_joined_at
  ON matchmaking_queue (joined_at ASC);

-- ─── Görünüm: Sıradaki arama bekleme süreleri ───────────────────────────────
CREATE OR REPLACE VIEW queue_wait_times AS
SELECT
  username,
  game_mode,
  status,
  joined_at,
  EXTRACT(EPOCH FROM (NOW() - joined_at)) AS wait_seconds
FROM matchmaking_queue
WHERE status = 'searching'
ORDER BY joined_at ASC;

-- ─── RLS: active_matches ───────────────────────────────────────────────────
-- (RLS zaten tanımlandıysa bu satırları atla)
-- ALTER TABLE active_matches ENABLE ROW LEVEL SECURITY;

-- ─── Yardımcı fonksiyon: Belirli bir maç için süresi geçen kayıtları temizle
-- Opsiyonel: CRON ile her gün çalıştırılabilir
CREATE OR REPLACE FUNCTION cleanup_stale_matches()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- 2 saatten eski "starting" veya "playing" maçları temizle
  DELETE FROM active_matches
  WHERE status IN ('starting', 'playing')
    AND created_at < NOW() - INTERVAL '2 hours';

  -- 24 saatten eski matchmaking_queue kayıtlarını temizle
  DELETE FROM matchmaking_queue
  WHERE joined_at < NOW() - INTERVAL '24 hours';
END;
$$;
