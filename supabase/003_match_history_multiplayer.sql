-- ─── NovaBall v0.6 — Çok Oyunculu Maç Geçmişi Güncellemesi ─────────────────
-- Bu migrasyon:
--   1. match_history tablosuna opponent_username kolonu ekler
--      (displayName yerine gerçek username saklamak için)
--   2. match_history tablosuna match_uuid kolonu ekler
--      (aynı maçın iki tarafını birbirine bağlamak için)
--   3. Gerekli indeksleri oluşturur
--
-- Supabase SQL Editor'da çalıştır.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. opponent_username: rakibin gerçek kullanıcı adı
ALTER TABLE match_history
  ADD COLUMN IF NOT EXISTS opponent_username TEXT NOT NULL DEFAULT '';

-- 2. match_uuid: her maçın benzersiz kimliği (host tarafında üretilir)
ALTER TABLE match_history
  ADD COLUMN IF NOT EXISTS match_uuid UUID;

-- 3. İndeksler — profil sayfası ve istatistik sorguları için
CREATE INDEX IF NOT EXISTS idx_match_history_opponent_username
  ON match_history (opponent_username);

CREATE INDEX IF NOT EXISTS idx_match_history_match_uuid
  ON match_history (match_uuid);

-- 4. Sonuç kontrolü
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'match_history'
ORDER BY ordinal_position;
