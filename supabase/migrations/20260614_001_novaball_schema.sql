-- ═══════════════════════════════════════════════════════════════════════════════
-- NovaBall — Supabase Schema Migration
-- Dosya: 20260614_001_novaball_schema.sql
-- Açıklama: Tam şema tanımı (players, match_history, custom_rooms, rpc'ler)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Uzantılar ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── players tablosu ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.players (
  username              TEXT         PRIMARY KEY,
  display_name          TEXT         NOT NULL,
  email                 TEXT         UNIQUE,
  auth_id               UUID         UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  rp                    INTEGER      NOT NULL DEFAULT 0,
  current_rank          TEXT         NOT NULL DEFAULT 'Rookie I',
  total_matches         INTEGER      NOT NULL DEFAULT 0,
  total_wins            INTEGER      NOT NULL DEFAULT 0,
  total_losses          INTEGER      NOT NULL DEFAULT 0,
  total_draws           INTEGER      NOT NULL DEFAULT 0,
  total_goals_scored    INTEGER      NOT NULL DEFAULT 0,
  total_goals_conceded  INTEGER      NOT NULL DEFAULT 0,
  last_seen             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Otomatik updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_players_updated_at ON public.players;
CREATE TRIGGER trg_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── match_history tablosu ────────────────────────────────────────────────────
-- Yalnızca ranked (rekabetçi) maçlar kaydedilir.
-- Özel oda maçları (custom rooms) bu tabloya kaydedilmez.
CREATE TABLE IF NOT EXISTS public.match_history (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_username TEXT         NOT NULL REFERENCES public.players(username) ON DELETE CASCADE,
  opponent_name   TEXT         NOT NULL,
  player_goals    INTEGER      NOT NULL DEFAULT 0,
  opponent_goals  INTEGER      NOT NULL DEFAULT 0,
  result          TEXT         NOT NULL CHECK (result IN ('win','loss','draw')),
  rp_gained       INTEGER      NOT NULL DEFAULT 0,
  rp_before       INTEGER      NOT NULL DEFAULT 0,
  rp_after        INTEGER      NOT NULL DEFAULT 0,
  ranked          BOOLEAN      NOT NULL DEFAULT TRUE,
  played_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_history_player_username
  ON public.match_history(player_username);

CREATE INDEX IF NOT EXISTS idx_match_history_played_at
  ON public.match_history(played_at DESC);

CREATE INDEX IF NOT EXISTS idx_match_history_ranked
  ON public.match_history(ranked);

-- ─── custom_rooms tablosu ─────────────────────────────────────────────────────
-- Özel oda bilgilerini geçici olarak tutar (Realtime sync için).
CREATE TABLE IF NOT EXISTS public.custom_rooms (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT         NOT NULL,
  host_username TEXT         NOT NULL REFERENCES public.players(username) ON DELETE CASCADE,
  max_players   INTEGER      NOT NULL DEFAULT 2,  -- Her zaman 2 (1v1)
  red_team      JSONB        NOT NULL DEFAULT '[]',
  blue_team     JSONB        NOT NULL DEFAULT '[]',
  status        TEXT         NOT NULL DEFAULT 'waiting'
                             CHECK (status IN ('waiting','starting','playing','finished')),
  channel_id    TEXT         NOT NULL UNIQUE DEFAULT uuid_generate_v4()::TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_rooms_status
  ON public.custom_rooms(status);

CREATE INDEX IF NOT EXISTS idx_custom_rooms_host
  ON public.custom_rooms(host_username);

-- Eski odaları otomatik temizle (1 saatten eski finished/waiting odalar)
CREATE OR REPLACE FUNCTION public.cleanup_stale_rooms()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.custom_rooms
  WHERE status IN ('finished', 'waiting')
    AND created_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- ─── RPC: create_player ───────────────────────────────────────────────────────
-- E-posta doğrulama öncesinde de çalışır (SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.create_player(
  p_username     TEXT,
  p_display_name TEXT,
  p_email        TEXT,
  p_auth_id      UUID
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.players(username, display_name, email, auth_id, rp)
  VALUES (p_username, p_display_name, p_email, p_auth_id, 0)
  ON CONFLICT (username) DO NOTHING;
END;
$$;

-- ─── RPC: get_email_by_username ───────────────────────────────────────────────
-- Kullanıcı adından e-posta arama (giriş akışı için).
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM public.players
  WHERE username = p_username;
  RETURN v_email;
END;
$$;

-- ─── Row Level Security (RLS) ─────────────────────────────────────────────────
ALTER TABLE public.players      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_rooms  ENABLE ROW LEVEL SECURITY;

-- players: herkes okuyabilir, sadece kendi kaydını güncelleyebilir
DROP POLICY IF EXISTS "players_select_public"  ON public.players;
DROP POLICY IF EXISTS "players_insert_own"     ON public.players;
DROP POLICY IF EXISTS "players_update_own"     ON public.players;

CREATE POLICY "players_select_public"
  ON public.players FOR SELECT USING (true);

CREATE POLICY "players_insert_own"
  ON public.players FOR INSERT
  WITH CHECK (auth_id = auth.uid() OR auth.uid() IS NULL);

CREATE POLICY "players_update_own"
  ON public.players FOR UPDATE
  USING (auth_id = auth.uid());

-- match_history: herkes okuyabilir, sadece kendi maçlarını ekleyebilir
-- NOT: Özel oda maçları client tarafında zaten eklenmez.
DROP POLICY IF EXISTS "match_history_select_public"  ON public.match_history;
DROP POLICY IF EXISTS "match_history_insert_own"     ON public.match_history;

CREATE POLICY "match_history_select_public"
  ON public.match_history FOR SELECT USING (true);

CREATE POLICY "match_history_insert_own"
  ON public.match_history FOR INSERT
  WITH CHECK (
    player_username IN (
      SELECT username FROM public.players WHERE auth_id = auth.uid()
    )
  );

-- custom_rooms: herkes okuyabilir, host oluşturabilir/güncelleyebilir/silebilir
DROP POLICY IF EXISTS "custom_rooms_select_public" ON public.custom_rooms;
DROP POLICY IF EXISTS "custom_rooms_insert_host"   ON public.custom_rooms;
DROP POLICY IF EXISTS "custom_rooms_update_host"   ON public.custom_rooms;
DROP POLICY IF EXISTS "custom_rooms_delete_host"   ON public.custom_rooms;

CREATE POLICY "custom_rooms_select_public"
  ON public.custom_rooms FOR SELECT USING (true);

CREATE POLICY "custom_rooms_insert_host"
  ON public.custom_rooms FOR INSERT
  WITH CHECK (
    host_username IN (
      SELECT username FROM public.players WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "custom_rooms_update_host"
  ON public.custom_rooms FOR UPDATE
  USING (true);

CREATE POLICY "custom_rooms_delete_host"
  ON public.custom_rooms FOR DELETE
  USING (
    host_username IN (
      SELECT username FROM public.players WHERE auth_id = auth.uid()
    )
  );

-- ─── Realtime yayını ──────────────────────────────────────────────────────────
-- Supabase Dashboard > Database > Replication kısmında şu tabloları etkinleştirin:
--   ✓ players
--   ✓ match_history
--   ✓ custom_rooms

-- ─── Notlar ───────────────────────────────────────────────────────────────────
-- 1. Özel oda maçları (custom rooms, ranked=false) artık match_history'ye
--    kaydedilmez ve oyuncu istatistiklerini etkilemez.
-- 2. match_history.ranked sütunu her zaman TRUE olarak kaydedilir.
-- 3. custom_rooms.max_players her zaman 2 (1v1) olarak oluşturulur.
-- 4. Eski odaları temizlemek için: SELECT public.cleanup_stale_rooms();
