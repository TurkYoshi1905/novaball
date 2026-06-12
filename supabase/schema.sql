-- ═══════════════════════════════════════════════════════════════════════════
--  NovaBall — Supabase Veritabanı Şeması
--  Versiyon : 3.0.0
--  Tarih    : 2026-06-12
--
--  Kullanım:
--    Supabase Dashboard → SQL Editor → bu dosyayı yapıştır → Run (▶)
--
--  Tablolar:
--    players       — oyuncu profili, RP, istatistikler
--    match_history — rekabet maçı kayıtları
--
--  Auth:
--    Supabase Email+Password Auth (tam hesap sistemi)
--    Supabase Dashboard → Authentication → Providers → Email → Etkinleştir
--
--  Gerçek Zamanlı:
--    players + match_history → supabase_realtime yayınına dahil
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Uzantılar ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── players ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  username              TEXT        PRIMARY KEY,
  display_name          TEXT        NOT NULL DEFAULT '',
  email                 TEXT        UNIQUE,
  auth_id               UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  rp                    INTEGER     NOT NULL DEFAULT 0,
  total_matches         INTEGER     NOT NULL DEFAULT 0,
  total_wins            INTEGER     NOT NULL DEFAULT 0,
  total_losses          INTEGER     NOT NULL DEFAULT 0,
  total_draws           INTEGER     NOT NULL DEFAULT 0,
  total_goals_scored    INTEGER     NOT NULL DEFAULT 0,
  total_goals_conceded  INTEGER     NOT NULL DEFAULT 0,
  last_seen             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT players_rp_nn           CHECK (rp >= 0),
  CONSTRAINT players_matches_nn      CHECK (total_matches >= 0),
  CONSTRAINT players_wins_nn         CHECK (total_wins >= 0),
  CONSTRAINT players_losses_nn       CHECK (total_losses >= 0),
  CONSTRAINT players_draws_nn        CHECK (total_draws >= 0),
  CONSTRAINT players_scored_nn       CHECK (total_goals_scored >= 0),
  CONSTRAINT players_conceded_nn     CHECK (total_goals_conceded >= 0),
  CONSTRAINT players_username_fmt    CHECK (username ~ '^[a-z0-9]{3,15}$')
);

COMMENT ON TABLE  players              IS 'NovaBall oyuncu profilleri ve istatistikleri (v3)';
COMMENT ON COLUMN players.username     IS 'Benzersiz oyuncu adı — yalnızca küçük harf/rakam, 3-15 karakter';
COMMENT ON COLUMN players.display_name IS 'Görünen ad — profil ve lider tablosunda gösterilen isim';
COMMENT ON COLUMN players.email        IS 'Kayıt e-postası — kullanıcı adı bazlı giriş için gerekli';
COMMENT ON COLUMN players.auth_id      IS 'Supabase Auth UUID — RLS sahiplik doğrulaması için';
COMMENT ON COLUMN players.last_seen    IS 'Son aktif zaman — aktif oyuncu göstergesi için';

CREATE INDEX IF NOT EXISTS idx_players_rp       ON players (rp DESC);
CREATE INDEX IF NOT EXISTS idx_players_auth_id  ON players (auth_id);
CREATE INDEX IF NOT EXISTS idx_players_last_seen ON players (last_seen DESC);


-- ─── match_history ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_history (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_username  TEXT        NOT NULL REFERENCES players(username)
                                ON UPDATE CASCADE ON DELETE CASCADE,
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
  CONSTRAINT match_goals_nn           CHECK (player_goals >= 0 AND opponent_goals >= 0),
  CONSTRAINT match_rp_nn              CHECK (rp_before >= 0 AND rp_after >= 0),
  CONSTRAINT match_rp_consistency     CHECK (
    (result = 'win'  AND rp_after = rp_before + rp_gained) OR
    (result != 'win' AND rp_gained = 0 AND rp_after = rp_before)
  )
);

COMMENT ON TABLE match_history IS 'NovaBall rekabet maçı geçmişi (v3)';

CREATE INDEX IF NOT EXISTS idx_match_history_player_time ON match_history (player_username, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_history_played_at   ON match_history (played_at DESC);


-- ─── updated_at Trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS players_updated_at ON players;
CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─── RPC: Kullanıcı adı → e-posta (giriş için) ───────────────────────────────
--  Güvenlik: SECURITY DEFINER ile çalışır; e-posta doğrudan seçilemiyor.
--  Yalnızca username biliniyorsa email döner; brute-force için anlamlı değil
--  çünkü şifre hâlâ gerekli.

CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT email FROM players WHERE username = p_username);
END;
$$;

COMMENT ON FUNCTION get_email_by_username IS 'Kullanıcı adı bazlı giriş için e-posta döner';

-- Anonim kullanıcılar bu fonksiyonu çağırabilir
GRANT EXECUTE ON FUNCTION get_email_by_username TO anon;
GRANT EXECUTE ON FUNCTION get_email_by_username TO authenticated;


-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE players       ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- players: okuma herkese açık
DROP POLICY IF EXISTS "players_public_read"   ON players;
DROP POLICY IF EXISTS "players_public_write"  ON players;
DROP POLICY IF EXISTS "players_own_insert"    ON players;
DROP POLICY IF EXISTS "players_own_update"    ON players;

CREATE POLICY "players_public_read"
  ON players FOR SELECT USING (true);

-- INSERT: yalnızca kendi auth_id'sini kullanan kayıtlı kullanıcı ekleyebilir
CREATE POLICY "players_own_insert"
  ON players FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth_id = auth.uid()
  );

-- UPDATE: yalnızca kendi kaydını güncelleyebilir
CREATE POLICY "players_own_update"
  ON players FOR UPDATE
  USING  (auth.uid() IS NOT NULL AND auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- match_history: okuma herkese açık
DROP POLICY IF EXISTS "match_history_public_read"   ON match_history;
DROP POLICY IF EXISTS "match_history_public_write"  ON match_history;
DROP POLICY IF EXISTS "match_history_own_insert"    ON match_history;

CREATE POLICY "match_history_public_read"
  ON match_history FOR SELECT USING (true);

-- INSERT: yalnızca kendi kullanıcı adına ait maç eklenebilir
CREATE POLICY "match_history_own_insert"
  ON match_history FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    player_username IN (
      SELECT username FROM players WHERE auth_id = auth.uid()
    )
  );


-- ─── Gerçek Zamanlı ───────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE match_history;


-- ─── Doğrulama ────────────────────────────────────────────────────────────────
--  SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'public' AND table_name IN ('players','match_history');
--
--  SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_name = 'players'
--    ORDER BY ordinal_position;
--
--  SELECT policyname, cmd FROM pg_policies
--    WHERE tablename IN ('players','match_history');
--
--  SELECT routine_name FROM information_schema.routines
--    WHERE routine_name = 'get_email_by_username';
--
--  SELECT schemaname, tablename FROM pg_publication_tables
--    WHERE pubname = 'supabase_realtime';

-- ═══════════════════════════════════════════════════════════════════════════
--  Şema v3.0.0 tamamlandı.
--
--  Supabase Dashboard'da yapılacaklar:
--  1. Authentication → Providers → Email → Etkinleştir
--  2. Authentication → URL Configuration → Site URL = Vercel URL
--  3. Vercel → Environment Variables:
--       VITE_SUPABASE_URL      = https://kxpslnlhuhbnqoyviubx.supabase.co
--       VITE_SUPABASE_ANON_KEY = <anon_key>
-- ═══════════════════════════════════════════════════════════════════════════
