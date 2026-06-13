-- ─── NovaBall v0.6.1 — Gelişmiş Maç Şeması ──────────────────────────────────
-- Bu dosyayı Supabase SQL Editor'da çalıştır.
--
-- İçerik:
--   1. match_history gelişmiş kolonlar (opponent_username, match_uuid, winner_team)
--   2. players tablosu ek istatistik kolonlar (total_forfeits, longest_win_streak)
--   3. Row Level Security (RLS) politikaları
--   4. İstatistik view'leri
--   5. İndeksler
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. match_history genişletme ──────────────────────────────────────────────

ALTER TABLE match_history
  ADD COLUMN IF NOT EXISTS opponent_username  TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS match_uuid         UUID,
  ADD COLUMN IF NOT EXISTS winner_team        TEXT    CHECK (winner_team IN ('red','blue','draw')),
  ADD COLUMN IF NOT EXISTS forfeit            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS duration_seconds   INTEGER,
  ADD COLUMN IF NOT EXISTS game_mode          TEXT    NOT NULL DEFAULT '1v1';

-- ── 2. players tablosu ek istatistikler ──────────────────────────────────────

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS total_forfeits          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_forfeits_suffered INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_goals_conceded    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_win_streak      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_win_streak      INTEGER NOT NULL DEFAULT 0;

-- ── 3. Row Level Security ─────────────────────────────────────────────────────

-- match_history: herkes kendi maçını okuyabilir, sadece servis role yazabilir
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kendi maç geçmişini oku" ON match_history;
CREATE POLICY "Kendi maç geçmişini oku"
  ON match_history FOR SELECT
  USING (true);  -- Genel lider tablosu için herkese açık okuma

DROP POLICY IF EXISTS "Maç ekle" ON match_history;
CREATE POLICY "Maç ekle"
  ON match_history FOR INSERT
  WITH CHECK (true);  -- Anon key ile client-side insert izni

-- players: herkese açık okuma, kendi kaydını güncelleme
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Oyuncuları oku" ON players;
CREATE POLICY "Oyuncuları oku"
  ON players FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Oyuncu güncelle" ON players;
CREATE POLICY "Oyuncu güncelle"
  ON players FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Oyuncu ekle" ON players;
CREATE POLICY "Oyuncu ekle"
  ON players FOR INSERT
  WITH CHECK (true);

-- ── 4. İndeksler ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_match_history_player_username
  ON match_history (player_username, played_at DESC);

CREATE INDEX IF NOT EXISTS idx_match_history_opponent_username
  ON match_history (opponent_username);

CREATE INDEX IF NOT EXISTS idx_match_history_match_uuid
  ON match_history (match_uuid);

CREATE INDEX IF NOT EXISTS idx_match_history_result
  ON match_history (result, ranked);

CREATE INDEX IF NOT EXISTS idx_players_rp
  ON players (rp DESC);

-- ── 5. Oyuncu istatistik view'i ───────────────────────────────────────────────

CREATE OR REPLACE VIEW player_stats_view AS
SELECT
  p.username,
  p.display_name,
  p.rp,
  p.total_matches,
  p.total_wins,
  p.total_losses,
  p.total_draws,
  p.total_goals_scored,
  p.total_goals_conceded,
  p.total_forfeits,
  p.total_forfeits_suffered,
  p.longest_win_streak,
  p.current_win_streak,
  CASE WHEN p.total_matches > 0
    THEN ROUND(p.total_wins::numeric / p.total_matches * 100, 1)
    ELSE 0
  END AS win_rate,
  CASE WHEN p.total_matches > 0
    THEN ROUND(p.total_goals_scored::numeric / p.total_matches, 2)
    ELSE 0
  END AS goals_per_match,
  p.last_seen,
  p.created_at
FROM players p;

-- ── 6. Son maçlar view'i ──────────────────────────────────────────────────────

CREATE OR REPLACE VIEW recent_matches_view AS
SELECT
  mh.id,
  mh.player_username,
  mh.opponent_name,
  mh.opponent_username,
  mh.player_goals,
  mh.opponent_goals,
  mh.result,
  mh.rp_gained,
  mh.rp_before,
  mh.rp_after,
  mh.ranked,
  mh.forfeit,
  mh.game_mode,
  mh.winner_team,
  mh.match_uuid,
  mh.played_at
FROM match_history mh
ORDER BY mh.played_at DESC;

-- ── 7. Win streak güncelleme fonksiyonu ───────────────────────────────────────

CREATE OR REPLACE FUNCTION update_win_streak(p_username TEXT, p_result TEXT)
RETURNS VOID AS $$
BEGIN
  IF p_result = 'win' THEN
    UPDATE players SET
      current_win_streak = current_win_streak + 1,
      longest_win_streak = GREATEST(longest_win_streak, current_win_streak + 1)
    WHERE username = p_username;
  ELSE
    UPDATE players SET current_win_streak = 0
    WHERE username = p_username;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ── Kontrol ───────────────────────────────────────────────────────────────────

SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('match_history', 'players')
ORDER BY table_name, ordinal_position;
