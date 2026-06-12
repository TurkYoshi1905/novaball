-- ═══════════════════════════════════════════════════════════════════════════
--  NovaBall — Supabase Veritabanı Şeması
--  Versiyon : 1.0.0
--  Tarih    : 2026-06-12
--
--  Kullanım:
--    Supabase Dashboard → SQL Editor → bu dosyayı yapıştır → Run (▶)
--
--  Tablolar:
--    players       — oyuncu profili, RP, istatistikler
--    match_history — rekabet maçı kayıtları
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Uzantılar ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid() için

-- ─── Tablolar ─────────────────────────────────────────────────────────────────

-- players: Her oyuncu için bir satır (username birincil anahtar)
CREATE TABLE IF NOT EXISTS players (
  username              TEXT        PRIMARY KEY,
  rp                    INTEGER     NOT NULL DEFAULT 0,
  total_matches         INTEGER     NOT NULL DEFAULT 0,
  total_wins            INTEGER     NOT NULL DEFAULT 0,
  total_losses          INTEGER     NOT NULL DEFAULT 0,
  total_draws           INTEGER     NOT NULL DEFAULT 0,
  total_goals_scored    INTEGER     NOT NULL DEFAULT 0,
  total_goals_conceded  INTEGER     NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Kısıtlamalar
  CONSTRAINT players_rp_non_negative         CHECK (rp >= 0),
  CONSTRAINT players_matches_non_negative    CHECK (total_matches >= 0),
  CONSTRAINT players_wins_non_negative       CHECK (total_wins >= 0),
  CONSTRAINT players_losses_non_negative     CHECK (total_losses >= 0),
  CONSTRAINT players_draws_non_negative      CHECK (total_draws >= 0),
  CONSTRAINT players_goals_scored_nn         CHECK (total_goals_scored >= 0),
  CONSTRAINT players_goals_conceded_nn       CHECK (total_goals_conceded >= 0),
  CONSTRAINT players_match_sum               CHECK (total_wins + total_losses + total_draws <= total_matches + 1)
);

COMMENT ON TABLE  players                      IS 'NovaBall oyuncu profilleri ve istatistikleri';
COMMENT ON COLUMN players.username             IS 'Benzersiz oyuncu adı (birincil anahtar)';
COMMENT ON COLUMN players.rp                   IS 'Puan (Rank Points) — sıralamanın temeli';
COMMENT ON COLUMN players.total_matches        IS 'Toplam rekabet maçı sayısı';
COMMENT ON COLUMN players.total_wins           IS 'Galibiyet sayısı';
COMMENT ON COLUMN players.total_losses         IS 'Mağlubiyet sayısı';
COMMENT ON COLUMN players.total_draws          IS 'Beraberlik sayısı';
COMMENT ON COLUMN players.total_goals_scored   IS 'Toplam atılan gol';
COMMENT ON COLUMN players.total_goals_conceded IS 'Toplam yenilen gol';
COMMENT ON COLUMN players.updated_at           IS 'Son güncelleme zamanı (trigger ile otomatik)';


-- match_history: Her rekabet maçı için bir satır
CREATE TABLE IF NOT EXISTS match_history (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_username  TEXT        NOT NULL REFERENCES players(username)
                                ON UPDATE CASCADE
                                ON DELETE CASCADE,
  opponent_name    TEXT        NOT NULL DEFAULT 'AI',
  player_goals     INTEGER     NOT NULL,
  opponent_goals   INTEGER     NOT NULL,
  result           TEXT        NOT NULL,
  rp_gained        INTEGER     NOT NULL DEFAULT 0,
  rp_before        INTEGER     NOT NULL DEFAULT 0,
  rp_after         INTEGER     NOT NULL DEFAULT 0,
  ranked           BOOLEAN     NOT NULL DEFAULT false,
  played_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Kısıtlamalar
  CONSTRAINT match_result_valid       CHECK (result IN ('win', 'loss', 'draw')),
  CONSTRAINT match_player_goals_nn    CHECK (player_goals >= 0),
  CONSTRAINT match_opponent_goals_nn  CHECK (opponent_goals >= 0),
  CONSTRAINT match_rp_before_nn       CHECK (rp_before >= 0),
  CONSTRAINT match_rp_after_nn        CHECK (rp_after >= 0),
  CONSTRAINT match_rp_consistency     CHECK (
    (result = 'win'  AND rp_after = rp_before + rp_gained) OR
    (result != 'win' AND rp_gained = 0 AND rp_after = rp_before)
  )
);

COMMENT ON TABLE  match_history                 IS 'NovaBall rekabet maçı geçmişi';
COMMENT ON COLUMN match_history.id              IS 'UUID birincil anahtar';
COMMENT ON COLUMN match_history.player_username IS 'Oyuncu adı → players.username FK';
COMMENT ON COLUMN match_history.opponent_name   IS 'Rakip adı (şu an daima AI)';
COMMENT ON COLUMN match_history.result          IS 'Maç sonucu: win | loss | draw';
COMMENT ON COLUMN match_history.rp_gained       IS 'Kazanılan RP (yalnızca galibiyette > 0)';
COMMENT ON COLUMN match_history.rp_before       IS 'Maç öncesi RP';
COMMENT ON COLUMN match_history.rp_after        IS 'Maç sonrası RP';
COMMENT ON COLUMN match_history.ranked          IS 'Rekabet modu ise true';


-- ─── İndeksler ────────────────────────────────────────────────────────────────

-- Lider tablosu sorgusu: players RP'ye göre azalan sırada
CREATE INDEX IF NOT EXISTS idx_players_rp
  ON players (rp DESC);

-- Profil sayfası: oyuncunun son maçları, en yeni önce
CREATE INDEX IF NOT EXISTS idx_match_history_player_time
  ON match_history (player_username, played_at DESC);

-- Genel zaman bazlı sorgular (son N gün gibi)
CREATE INDEX IF NOT EXISTS idx_match_history_played_at
  ON match_history (played_at DESC);


-- ─── updated_at Trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_updated_at IS 'players.updated_at alanını otomatik günceller';

DROP TRIGGER IF EXISTS players_updated_at ON players;
CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ─── Row Level Security (RLS) ─────────────────────────────────────────────────
--  NovaBall kullanıcı adı tabanlı bir oyundur (gerçek auth yok).
--  Herkes okuyabilir ve yazabilir — kasıtlı olarak açık bırakıldı.

ALTER TABLE players      ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- players
DROP POLICY IF EXISTS "players_public_read"  ON players;
DROP POLICY IF EXISTS "players_public_write" ON players;

CREATE POLICY "players_public_read"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "players_public_write"
  ON players FOR ALL
  USING (true)
  WITH CHECK (true);

-- match_history
DROP POLICY IF EXISTS "match_history_public_read"  ON match_history;
DROP POLICY IF EXISTS "match_history_public_write" ON match_history;

CREATE POLICY "match_history_public_read"
  ON match_history FOR SELECT
  USING (true);

CREATE POLICY "match_history_public_write"
  ON match_history FOR ALL
  USING (true)
  WITH CHECK (true);


-- ─── Doğrulama Sorguları ──────────────────────────────────────────────────────
--  Kurulum sonrası aşağıdaki SELECT'ler ile kontrol edebilirsin:
--
--  SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'public' AND table_name IN ('players','match_history');
--
--  SELECT indexname FROM pg_indexes
--    WHERE tablename IN ('players','match_history');
--
--  SELECT policyname, tablename FROM pg_policies
--    WHERE tablename IN ('players','match_history');

-- ═══════════════════════════════════════════════════════════════════════════
--  Şema başarıyla oluşturuldu.
--  Sonraki adım: Vercel → Project Settings → Environment Variables
--    VITE_SUPABASE_URL  = https://kxpslnlhuhbnqoyviubx.supabase.co
--    VITE_SUPABASE_ANON_KEY = <anon key>
-- ═══════════════════════════════════════════════════════════════════════════
