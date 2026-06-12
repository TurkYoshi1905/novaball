-- ═══════════════════════════════════════════════════════════════════════════
--  NovaBall — Supabase Veritabanı Şeması
--  Versiyon : 2.0.0
--  Tarih    : 2026-06-12
--
--  Kullanım:
--    Supabase Dashboard → SQL Editor → bu dosyayı yapıştır → Run (▶)
--
--  Tablolar:
--    players       — oyuncu profili, RP, istatistikler
--    match_history — rekabet maçı kayıtları
--
--  Güvenlik:
--    • Supabase Anonymous Auth kullanılıyor (her tarayıcıya UUID verilir)
--    • Oyuncular yalnızca kendi kayıtlarını güncelleyebilir (auth_id = auth.uid())
--    • Lider tablosu ve profil herkese açık okunabilir
--
--  Gerçek Zamanlı:
--    • players       → lider tablosunu canlı günceller
--    • match_history → profil maç geçmişini canlı günceller
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Uzantılar ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tablolar ─────────────────────────────────────────────────────────────────

-- players: Her oyuncu için bir satır
CREATE TABLE IF NOT EXISTS players (
  username              TEXT        PRIMARY KEY,
  auth_id               UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  rp                    INTEGER     NOT NULL DEFAULT 0,
  total_matches         INTEGER     NOT NULL DEFAULT 0,
  total_wins            INTEGER     NOT NULL DEFAULT 0,
  total_losses          INTEGER     NOT NULL DEFAULT 0,
  total_draws           INTEGER     NOT NULL DEFAULT 0,
  total_goals_scored    INTEGER     NOT NULL DEFAULT 0,
  total_goals_conceded  INTEGER     NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT players_rp_non_negative        CHECK (rp >= 0),
  CONSTRAINT players_matches_non_negative   CHECK (total_matches >= 0),
  CONSTRAINT players_wins_non_negative      CHECK (total_wins >= 0),
  CONSTRAINT players_losses_non_negative    CHECK (total_losses >= 0),
  CONSTRAINT players_draws_non_negative     CHECK (total_draws >= 0),
  CONSTRAINT players_goals_scored_nn        CHECK (total_goals_scored >= 0),
  CONSTRAINT players_goals_conceded_nn      CHECK (total_goals_conceded >= 0),
  CONSTRAINT players_match_sum              CHECK (total_wins + total_losses + total_draws <= total_matches + 1)
);

COMMENT ON TABLE  players          IS 'NovaBall oyuncu profilleri ve istatistikleri';
COMMENT ON COLUMN players.auth_id  IS 'Supabase Anonymous Auth UUID — sahiplik doğrulaması için';

-- auth_id için indeks (RLS ve sahip sorgularında hız kazandırır)
CREATE INDEX IF NOT EXISTS idx_players_auth_id ON players(auth_id);


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

COMMENT ON TABLE  match_history IS 'NovaBall rekabet maçı geçmişi';


-- ─── İndeksler ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_players_rp
  ON players (rp DESC);

CREATE INDEX IF NOT EXISTS idx_match_history_player_time
  ON match_history (player_username, played_at DESC);

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

DROP TRIGGER IF EXISTS players_updated_at ON players;
CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ─── Row Level Security ───────────────────────────────────────────────────────
--
--  Model: Supabase Anonymous Auth
--    • Kullanıcı oyuna girince tarayıcısına anonim bir UUID atanır
--    • Bu UUID players.auth_id sütununda saklanır
--    • RLS: sadece kendi auth_id'si eşleşen oyuncu kendi kaydını yazabilir
--    • Okuma: lider tablosu / profil herkes tarafından görülebilir

ALTER TABLE players       ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- ── players ──────────────────────────────────────────────────────────────────

-- Herkes okuyabilir (lider tablosu, profil görüntüleme)
DROP POLICY IF EXISTS "players_public_read"  ON players;
DROP POLICY IF EXISTS "players_public_write" ON players;
DROP POLICY IF EXISTS "players_own_write"    ON players;

CREATE POLICY "players_public_read"
  ON players FOR SELECT
  USING (true);

-- Yalnızca kayıtlı oturum sahibi kendi satırını oluşturabilir / güncelleyebilir
CREATE POLICY "players_own_insert"
  ON players FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth_id = auth.uid()
  );

CREATE POLICY "players_own_update"
  ON players FOR UPDATE
  USING  (auth.uid() IS NOT NULL AND auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- ── match_history ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "match_history_public_read"  ON match_history;
DROP POLICY IF EXISTS "match_history_public_write" ON match_history;
DROP POLICY IF EXISTS "match_history_own_write"    ON match_history;

-- Herkes okuyabilir
CREATE POLICY "match_history_public_read"
  ON match_history FOR SELECT
  USING (true);

-- Yalnızca auth_id'si eşleşen oyuncu maç ekleyebilir
CREATE POLICY "match_history_own_insert"
  ON match_history FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    player_username IN (
      SELECT username FROM players WHERE auth_id = auth.uid()
    )
  );


-- ─── Gerçek Zamanlı (Realtime) ────────────────────────────────────────────────
--
--  Hangi tablolar gerçek zamanlı dinleniyor:
--    players       → lider tablosu canlı güncellenir (başka oyuncu RP kazanınca)
--    match_history → profil sayfası yeni maçları anlık gösterir
--
--  Frontend'de kullanım (supabase-js):
--    supabase.channel('leaderboard')
--      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, handler)
--      .subscribe()

ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE match_history;


-- ─── Doğrulama Sorguları ──────────────────────────────────────────────────────
--  Kurulum sonrası kontrol:
--
--  -- Tablolar var mı?
--  SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'public' AND table_name IN ('players','match_history');
--
--  -- auth_id kolonu eklendi mi?
--  SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_name = 'players' AND column_name = 'auth_id';
--
--  -- RLS politikaları doğru mu?
--  SELECT policyname, cmd, qual FROM pg_policies
--    WHERE tablename IN ('players','match_history');
--
--  -- Realtime yayında mı?
--  SELECT schemaname, tablename FROM pg_publication_tables
--    WHERE pubname = 'supabase_realtime';

-- ═══════════════════════════════════════════════════════════════════════════
--  Şema v2.0.0 başarıyla oluşturuldu.
--
--  Sonraki adımlar:
--  1. Supabase Dashboard → Authentication → Providers → Anonymous  → AKTİF ET
--  2. Vercel → Environment Variables:
--       VITE_SUPABASE_URL      = https://kxpslnlhuhbnqoyviubx.supabase.co
--       VITE_SUPABASE_ANON_KEY = <anon key>
-- ═══════════════════════════════════════════════════════════════════════════
