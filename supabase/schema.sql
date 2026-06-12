-- ═══════════════════════════════════════════════════════════════════════════
--  NovaBall — Supabase Veritabanı Şeması
--  Versiyon : 3.1.0  (uygulama v0.0.2)
--  Tarih    : 2026-06-12
--
--  Kullanım:
--    Supabase Dashboard → SQL Editor → bu dosyayı yapıştır → Run (▶)
--
--  Tablolar:
--    players       — oyuncu profili (görünen ad, kullanıcı adı, RP, istatistikler)
--    match_history — rekabet maçı kayıtları
--
--  Auth:
--    Supabase Email+Password Auth (e-posta doğrulama zorunlu)
--    Dashboard → Authentication → Providers → Email → Enable
--    Dashboard → Authentication → Email Templates → özelleştir (isteğe bağlı)
--
--  Giriş Yöntemi:
--    Kullanıcı adı + e-posta + şifre kombinasyonu
--    get_email_by_username() RPC → kullanıcı adından e-posta bulunur → signIn(email, password)
--
--  Gerçek Zamanlı:
--    players + match_history → supabase_realtime yayınına dahil
--    Lider tablosu anlık güncelleme + aktif oyuncu göstergesi (last_seen < 5dk)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Uzantılar ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── players ──────────────────────────────────────────────────────────────────
--  Birincil oyuncu profil tablosu.
--  Her Supabase Auth kullanıcısına karşılık gelen bir satır bulunur.
--  Kayıt sırasında createPlayer() çağrısı ile oluşturulur.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  -- Kimlik
  username              TEXT        PRIMARY KEY,
  display_name          TEXT        NOT NULL DEFAULT '',
  email                 TEXT        UNIQUE,
  auth_id               UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Rank Puanı
  rp                    INTEGER     NOT NULL DEFAULT 0,

  -- Maç İstatistikleri
  total_matches         INTEGER     NOT NULL DEFAULT 0,
  total_wins            INTEGER     NOT NULL DEFAULT 0,
  total_losses          INTEGER     NOT NULL DEFAULT 0,
  total_draws           INTEGER     NOT NULL DEFAULT 0,
  total_goals_scored    INTEGER     NOT NULL DEFAULT 0,
  total_goals_conceded  INTEGER     NOT NULL DEFAULT 0,

  -- Aktif Oyuncu Takibi
  last_seen             TIMESTAMPTZ,

  -- Zaman Damgaları
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Kısıtlamalar
  CONSTRAINT players_rp_nn           CHECK (rp >= 0),
  CONSTRAINT players_matches_nn      CHECK (total_matches >= 0),
  CONSTRAINT players_wins_nn         CHECK (total_wins >= 0),
  CONSTRAINT players_losses_nn       CHECK (total_losses >= 0),
  CONSTRAINT players_draws_nn        CHECK (total_draws >= 0),
  CONSTRAINT players_scored_nn       CHECK (total_goals_scored >= 0),
  CONSTRAINT players_conceded_nn     CHECK (total_goals_conceded >= 0),
  CONSTRAINT players_username_fmt    CHECK (username ~ '^[a-z0-9]{3,15}$'),
  CONSTRAINT players_display_name_len CHECK (char_length(display_name) <= 32)
);

COMMENT ON TABLE  players                  IS 'NovaBall oyuncu profilleri ve istatistikleri (v3.1)';
COMMENT ON COLUMN players.username         IS 'Benzersiz oyuncu adı — yalnızca küçük harf/rakam, 3-15 karakter';
COMMENT ON COLUMN players.display_name     IS 'Görünen ad — profil ve lider tablosunda gösterilen isim (max 32 karakter)';
COMMENT ON COLUMN players.email            IS 'Kayıt e-postası — kullanıcı adı bazlı giriş için gerekli';
COMMENT ON COLUMN players.auth_id          IS 'Supabase Auth UUID — RLS sahiplik doğrulaması için';
COMMENT ON COLUMN players.last_seen        IS 'Son aktif zaman — 5 dakika eşiği ile aktif oyuncu göstergesi';
COMMENT ON COLUMN players.rp               IS 'Rank Puanı — 0 başlar, kazanmak ile artar, yenilgi ile azalmaz';

CREATE INDEX IF NOT EXISTS idx_players_rp        ON players (rp DESC);
CREATE INDEX IF NOT EXISTS idx_players_auth_id   ON players (auth_id);
CREATE INDEX IF NOT EXISTS idx_players_last_seen ON players (last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_players_email     ON players (email);


-- ─── match_history ────────────────────────────────────────────────────────────
--  Her rekabet maçının kaydı.
--  Maç bitiminde saveMatch() + updatePlayerStats() ile yazılır.
-- ──────────────────────────────────────────────────────────────────────────────
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

COMMENT ON TABLE  match_history                  IS 'NovaBall rekabet maçı geçmişi (v3.1)';
COMMENT ON COLUMN match_history.rp_gained        IS 'Kazanılan RP (yenilgi=0, beraberlik=0)';
COMMENT ON COLUMN match_history.ranked           IS 'true=rekabet modu, false=serbest oyun';

CREATE INDEX IF NOT EXISTS idx_match_history_player_time ON match_history (player_username, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_history_played_at   ON match_history (played_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_history_result      ON match_history (result);


-- ─── updated_at Otomatik Güncelleme ───────────────────────────────────────────
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


-- ─── RPC: Kullanıcı Adı → E-Posta ────────────────────────────────────────────
--  Kullanım: Giriş sayfasında kullanıcı adı + e-posta doğrulaması için.
--  Güvenlik: SECURITY DEFINER — e-posta doğrudan sorgulanamaz.
--  Anonim kullanıcılar çağırabilir (brute-force anlamlı değil, şifre hâlâ gerekli).
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sadece doğrulanmış (aktif) oyuncuların e-postasını döndür
  RETURN (
    SELECT p.email
    FROM   players p
    WHERE  p.username = p_username
    LIMIT  1
  );
END;
$$;

COMMENT ON FUNCTION get_email_by_username IS 'Kullanıcı adı bazlı giriş: kullanıcı adından e-posta döner (SECURITY DEFINER)';

GRANT EXECUTE ON FUNCTION get_email_by_username TO anon;
GRANT EXECUTE ON FUNCTION get_email_by_username TO authenticated;


-- ─── RPC: Kullanıcı Adı Müsaitlik Kontrolü ───────────────────────────────────
--  Kayıt sırasında gerçek zamanlı kullanıcı adı kontrolü için.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM players WHERE username = p_username
  );
END;
$$;

COMMENT ON FUNCTION is_username_available IS 'Kayıt sırasında kullanıcı adı müsaitliğini kontrol eder';

GRANT EXECUTE ON FUNCTION is_username_available TO anon;
GRANT EXECUTE ON FUNCTION is_username_available TO authenticated;


-- ─── RPC: Lider Tablosu (Aktif Oyuncu Göstergesi ile) ────────────────────────
--  En yüksek RP'ye göre sıralı ilk 100 oyuncu.
--  is_active = last_seen < 5 dakika önce.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_leaderboard(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  username              TEXT,
  display_name          TEXT,
  rp                    INTEGER,
  total_matches         INTEGER,
  total_wins            INTEGER,
  total_losses          INTEGER,
  total_draws           INTEGER,
  total_goals_scored    INTEGER,
  total_goals_conceded  INTEGER,
  last_seen             TIMESTAMPTZ,
  is_active             BOOLEAN,
  created_at            TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
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
    p.last_seen,
    (p.last_seen IS NOT NULL AND p.last_seen > NOW() - INTERVAL '5 minutes') AS is_active,
    p.created_at,
    p.updated_at
  FROM   players p
  ORDER BY p.rp DESC, p.total_wins DESC
  LIMIT  p_limit;
END;
$$;

COMMENT ON FUNCTION get_leaderboard IS 'RP sıralamalı lider tablosu — is_active alanı ile aktif oyuncu göstergesi';

GRANT EXECUTE ON FUNCTION get_leaderboard TO anon;
GRANT EXECUTE ON FUNCTION get_leaderboard TO authenticated;


-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE players       ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- players politikaları
DROP POLICY IF EXISTS "players_public_read"   ON players;
DROP POLICY IF EXISTS "players_public_write"  ON players;
DROP POLICY IF EXISTS "players_own_insert"    ON players;
DROP POLICY IF EXISTS "players_own_update"    ON players;
DROP POLICY IF EXISTS "players_own_delete"    ON players;

-- Okuma: herkese açık (lider tablosu, profil görüntüleme)
CREATE POLICY "players_public_read"
  ON players FOR SELECT
  USING (true);

-- Ekleme: yalnızca kendi auth_id'si ile kayıt
CREATE POLICY "players_own_insert"
  ON players FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth_id = auth.uid()
  );

-- Güncelleme: yalnızca kendi kaydı
CREATE POLICY "players_own_update"
  ON players FOR UPDATE
  USING  (auth.uid() IS NOT NULL AND auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Silme: yalnızca kendi kaydı (hesap silme)
CREATE POLICY "players_own_delete"
  ON players FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth_id = auth.uid());


-- match_history politikaları
DROP POLICY IF EXISTS "match_history_public_read"   ON match_history;
DROP POLICY IF EXISTS "match_history_public_write"  ON match_history;
DROP POLICY IF EXISTS "match_history_own_insert"    ON match_history;

-- Okuma: herkese açık (profil sayfası maç geçmişi)
CREATE POLICY "match_history_public_read"
  ON match_history FOR SELECT
  USING (true);

-- Ekleme: yalnızca kendi kullanıcı adına ait maç
CREATE POLICY "match_history_own_insert"
  ON match_history FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    player_username IN (
      SELECT username FROM players WHERE auth_id = auth.uid()
    )
  );


-- ─── Gerçek Zamanlı ───────────────────────────────────────────────────────────
--  Lider tablosu ve maç geçmişi anlık güncelleme için.
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE match_history;


-- ─── Doğrulama Sorguları ──────────────────────────────────────────────────────
--  Aşağıdaki sorguları SQL Editor'da çalıştırarak şemayı doğrulayabilirsiniz:
--
--  1) Tablolar:
--     SELECT table_name FROM information_schema.tables
--       WHERE table_schema = 'public' AND table_name IN ('players','match_history');
--
--  2) Sütunlar:
--     SELECT column_name, data_type, is_nullable
--       FROM information_schema.columns
--       WHERE table_name = 'players'
--       ORDER BY ordinal_position;
--
--  3) RLS politikaları:
--     SELECT policyname, cmd, qual FROM pg_policies
--       WHERE tablename IN ('players','match_history');
--
--  4) RPC fonksiyonları:
--     SELECT routine_name, routine_type FROM information_schema.routines
--       WHERE routine_schema = 'public'
--         AND routine_name IN (
--           'get_email_by_username',
--           'is_username_available',
--           'get_leaderboard',
--           'update_updated_at'
--         );
--
--  5) Realtime yayın tabloları:
--     SELECT schemaname, tablename FROM pg_publication_tables
--       WHERE pubname = 'supabase_realtime';
--
--  6) Test — kullanıcı adı müsaitlik kontrolü:
--     SELECT is_username_available('testuser');

-- ═══════════════════════════════════════════════════════════════════════════
--  Şema v3.1.0 tamamlandı (NovaBall uygulama v0.0.2)
--
--  Supabase Dashboard'da yapılacaklar:
--  1. Authentication → Providers → Email → Enable + Confirm email: ON
--  2. Authentication → URL Configuration:
--       Site URL       = https://novaball.vercel.app  (veya Replit URL)
--       Redirect URLs  = https://novaball.vercel.app/**
--  3. Replit Secrets:
--       VITE_SUPABASE_URL      = https://<proje-id>.supabase.co
--       VITE_SUPABASE_ANON_KEY = <anon_key>
--  4. GitHub Actions (isteğe bağlı):
--       GITHUB_PAT secret → github-sync.sh push için
-- ═══════════════════════════════════════════════════════════════════════════
