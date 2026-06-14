-- ═══════════════════════════════════════════════════════════════════════════════
-- NovaBall — Supabase Schema Migration (MASTER / idempotent)
-- Dosya : 20260614_001_novaball_schema.sql
-- Sürüm : v3  (migration 002 + 003 değişiklikleri dahil edildi)
-- Açıklama:
--   Tüm tablolar, RLS, RPC'ler, index'ler ve trigger'lar tek dosyada.
--   CREATE OR REPLACE / IF NOT EXISTS / DROP … IF EXISTS kullanıldığı için
--   mevcut bir veritabanı üzerinde GÜVENLE YENİDEN ÇALIŞTIRILABİLİR.
--   (Yeni kurulum için de kullanılabilir.)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Uzantılar ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLOLAR
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── players ──────────────────────────────────────────────────────────────────
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

-- ─── match_history ────────────────────────────────────────────────────────────
-- Yalnızca ranked maçlar kaydedilir; özel oda maçları kaydedilmez.
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

-- ─── matchmaking_queue ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  username     TEXT         PRIMARY KEY REFERENCES public.players(username) ON DELETE CASCADE,
  display_name TEXT         NOT NULL,
  game_mode    TEXT         NOT NULL CHECK (game_mode IN ('1v1','2v2','3v3','4v4','5v5')),
  status       TEXT         NOT NULL DEFAULT 'searching'
               CHECK (status IN ('searching','matched','cancelled')),
  match_id     TEXT,
  joined_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── active_matches ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.active_matches (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  mode          TEXT         NOT NULL CHECK (mode IN ('1v1','2v2','3v3','4v4','5v5')),
  host_username TEXT         NOT NULL REFERENCES public.players(username) ON DELETE CASCADE,
  red_team      JSONB        NOT NULL DEFAULT '[]',
  blue_team     JSONB        NOT NULL DEFAULT '[]',
  status        TEXT         NOT NULL DEFAULT 'starting'
               CHECK (status IN ('waiting','starting','playing','finished')),
  channel_id    TEXT         NOT NULL UNIQUE,
  ranked        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── custom_rooms ─────────────────────────────────────────────────────────────
-- max_players: 2 (1v1) · 4 (2v2) · 6 (3v3) · 8 (4v4) · 10 (5v5)
-- Her takım maks max_players/2 oyuncu alır.
-- Özel odalar her zaman ranked=false'tur.
CREATE TABLE IF NOT EXISTS public.custom_rooms (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT         NOT NULL,
  host_username TEXT         NOT NULL REFERENCES public.players(username) ON DELETE CASCADE,
  max_players   INTEGER      NOT NULL DEFAULT 10,
  red_team      JSONB        NOT NULL DEFAULT '[]',
  blue_team     JSONB        NOT NULL DEFAULT '[]',
  status        TEXT         NOT NULL DEFAULT 'waiting'
                             CHECK (status IN ('waiting','starting','playing','finished')),
  channel_id    TEXT         NOT NULL UNIQUE DEFAULT uuid_generate_v4()::TEXT,
  ranked        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Mevcut tablolara eksik kolon ekle (yeniden çalıştırma güvenliği) ─────────
DO $$
BEGIN
  -- custom_rooms.ranked
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='custom_rooms' AND column_name='ranked'
  ) THEN
    ALTER TABLE public.custom_rooms ADD COLUMN ranked BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END;
$$;

-- max_players varsayılanını 10'a güncelle (önceden 2 ise düzelt)
ALTER TABLE public.custom_rooms ALTER COLUMN max_players SET DEFAULT 10;

-- max_players CHECK kısıtı: yalnızca 2/4/6/8/10 (HaxBall formatları)
ALTER TABLE public.custom_rooms DROP CONSTRAINT IF EXISTS custom_rooms_max_players_check;
ALTER TABLE public.custom_rooms ADD CONSTRAINT custom_rooms_max_players_check
  CHECK (max_players IN (2, 4, 6, 8, 10));

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEX'LER
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_match_history_player_username ON public.match_history(player_username);
CREATE INDEX IF NOT EXISTS idx_match_history_played_at       ON public.match_history(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_history_ranked          ON public.match_history(ranked);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_mode_status ON public.matchmaking_queue(game_mode, status);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_joined_at   ON public.matchmaking_queue(joined_at ASC);

CREATE INDEX IF NOT EXISTS idx_active_matches_status ON public.active_matches(status);
CREATE INDEX IF NOT EXISTS idx_active_matches_host   ON public.active_matches(host_username);

CREATE INDEX IF NOT EXISTS idx_custom_rooms_status ON public.custom_rooms(status);
CREATE INDEX IF NOT EXISTS idx_custom_rooms_host   ON public.custom_rooms(host_username);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER FONKSİYONLARI
-- ═══════════════════════════════════════════════════════════════════════════════

-- updated_at otomatik güncelle
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

-- Takım boyutu doğrulama — her takım maks max_players/2 oyuncu alabilir
CREATE OR REPLACE FUNCTION public.validate_room_teams()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  max_per_team INTEGER;
BEGIN
  max_per_team := NEW.max_players / 2;
  IF jsonb_array_length(NEW.red_team) > max_per_team THEN
    RAISE EXCEPTION 'Kırmızı takım dolu (maks % oyuncu).', max_per_team;
  END IF;
  IF jsonb_array_length(NEW.blue_team) > max_per_team THEN
    RAISE EXCEPTION 'Mavi takım dolu (maks % oyuncu).', max_per_team;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_room_teams ON public.custom_rooms;
CREATE TRIGGER trg_validate_room_teams
  BEFORE INSERT OR UPDATE ON public.custom_rooms
  FOR EACH ROW EXECUTE FUNCTION public.validate_room_teams();

-- Eski odaları temizle (1 saatten eski finished/waiting odalar)
CREATE OR REPLACE FUNCTION public.cleanup_stale_rooms()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.custom_rooms
  WHERE status IN ('finished', 'waiting')
    AND created_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC'LER (SECURITY DEFINER — RLS'yi bypass eder, içeride doğrulama yapar)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── create_player ────────────────────────────────────────────────────────────
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

-- ─── get_email_by_username ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM public.players WHERE username = p_username;
  RETURN v_email;
END;
$$;

-- ─── room_join_team ───────────────────────────────────────────────────────────
-- Kimliği doğrulanmış oyuncunun takıma katılmasını sağlar.
-- Her takım maks max_players/2 oyuncu alabilir.
CREATE OR REPLACE FUNCTION public.room_join_team(
  p_room_id      UUID,
  p_username     TEXT,
  p_display_name TEXT,
  p_team         TEXT  -- 'red' veya 'blue'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_room       RECORD;
  v_member     JSONB;
  v_new_red    JSONB;
  v_new_blue   JSONB;
  v_max_team   INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.players WHERE username = p_username AND auth_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Yetkisiz işlem: kullanıcı doğrulanamadı.';
  END IF;

  IF p_team NOT IN ('red', 'blue') THEN
    RAISE EXCEPTION 'Geçersiz takım: %. red veya blue olmalıdır.', p_team;
  END IF;

  SELECT * INTO v_room FROM public.custom_rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Oda bulunamadı: %', p_room_id;
  END IF;
  IF v_room.status <> 'waiting' THEN
    RAISE EXCEPTION 'Oda artık katılıma açık değil (durum: %).', v_room.status;
  END IF;

  v_max_team := v_room.max_players / 2;

  -- Kullanıcıyı her iki takımdan çıkar (takım değiştirme desteği)
  v_new_red  := COALESCE((SELECT jsonb_agg(e) FROM jsonb_array_elements(v_room.red_team)  e WHERE e->>'username' <> p_username), '[]'::JSONB);
  v_new_blue := COALESCE((SELECT jsonb_agg(e) FROM jsonb_array_elements(v_room.blue_team) e WHERE e->>'username' <> p_username), '[]'::JSONB);

  v_member := jsonb_build_object('username', p_username, 'displayName', p_display_name);

  IF p_team = 'red' THEN
    IF jsonb_array_length(v_new_red) >= v_max_team THEN
      RAISE EXCEPTION 'Kırmızı takım dolu (maks % oyuncu).', v_max_team;
    END IF;
    v_new_red := v_new_red || jsonb_build_array(v_member);
  ELSE
    IF jsonb_array_length(v_new_blue) >= v_max_team THEN
      RAISE EXCEPTION 'Mavi takım dolu (maks % oyuncu).', v_max_team;
    END IF;
    v_new_blue := v_new_blue || jsonb_build_array(v_member);
  END IF;

  UPDATE public.custom_rooms
  SET red_team = v_new_red, blue_team = v_new_blue
  WHERE id = p_room_id;

  RETURN jsonb_build_object('red_team', v_new_red, 'blue_team', v_new_blue);
END;
$$;

-- ─── room_leave ───────────────────────────────────────────────────────────────
-- HOST ayrılırsa  → oda SİLİNİR (tüm oyuncular "Oda Kapandı" görür)
-- GUEST ayrılırsa → sadece slot BOŞALIR, oda açık kalır, yeni oyuncu gelebilir
CREATE OR REPLACE FUNCTION public.room_leave(
  p_room_id  UUID,
  p_username TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_room     RECORD;
  v_new_red  JSONB;
  v_new_blue JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.players WHERE username = p_username AND auth_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Yetkisiz işlem: kullanıcı doğrulanamadı.';
  END IF;

  SELECT * INTO v_room FROM public.custom_rooms WHERE id = p_room_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- HOST ayrılıyorsa: odayı tamamen sil (status ne olursa olsun)
  IF v_room.host_username = p_username THEN
    DELETE FROM public.custom_rooms WHERE id = p_room_id;
    RETURN;
  END IF;

  -- GUEST ayrılıyorsa: sadece takımdan çıkar, oda AÇIK KALIR
  v_new_red  := COALESCE((SELECT jsonb_agg(e) FROM jsonb_array_elements(v_room.red_team)  e WHERE e->>'username' <> p_username), '[]'::JSONB);
  v_new_blue := COALESCE((SELECT jsonb_agg(e) FROM jsonb_array_elements(v_room.blue_team) e WHERE e->>'username' <> p_username), '[]'::JSONB);

  -- Her iki takım da boşaldıysa odayı sil (temizlik)
  IF jsonb_array_length(v_new_red) + jsonb_array_length(v_new_blue) = 0 THEN
    DELETE FROM public.custom_rooms WHERE id = p_room_id;
  ELSE
    UPDATE public.custom_rooms SET red_team = v_new_red, blue_team = v_new_blue WHERE id = p_room_id;
  END IF;
END;
$$;

-- ─── room_start ───────────────────────────────────────────────────────────────
-- Sadece host maçı başlatabilir (status: waiting → playing).
CREATE OR REPLACE FUNCTION public.room_start(
  p_room_id  UUID,
  p_username TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_room RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.players WHERE username = p_username AND auth_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Yetkisiz işlem: kullanıcı doğrulanamadı.';
  END IF;

  SELECT * INTO v_room FROM public.custom_rooms WHERE id = p_room_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Oda bulunamadı.'; END IF;
  IF v_room.host_username <> p_username THEN RAISE EXCEPTION 'Sadece oda sahibi maçı başlatabilir.'; END IF;
  IF v_room.status <> 'waiting' THEN RAISE EXCEPTION 'Oda zaten başladı (durum: %).', v_room.status; END IF;

  UPDATE public.custom_rooms SET status = 'playing' WHERE id = p_room_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.players            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_matches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_rooms       ENABLE ROW LEVEL SECURITY;

-- ─── players ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "players_select_public" ON public.players;
DROP POLICY IF EXISTS "players_insert_own"    ON public.players;
DROP POLICY IF EXISTS "players_update_own"    ON public.players;

CREATE POLICY "players_select_public" ON public.players FOR SELECT USING (true);
CREATE POLICY "players_insert_own"    ON public.players FOR INSERT
  WITH CHECK (auth_id = auth.uid() OR auth.uid() IS NULL);
CREATE POLICY "players_update_own"    ON public.players FOR UPDATE
  USING (auth_id = auth.uid());

-- ─── match_history ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "match_history_select_public" ON public.match_history;
DROP POLICY IF EXISTS "match_history_insert_own"    ON public.match_history;

CREATE POLICY "match_history_select_public" ON public.match_history FOR SELECT USING (true);
CREATE POLICY "match_history_insert_own"    ON public.match_history FOR INSERT
  WITH CHECK (
    player_username IN (SELECT username FROM public.players WHERE auth_id = auth.uid())
  );

-- ─── matchmaking_queue ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "queue_select_public" ON public.matchmaking_queue;
DROP POLICY IF EXISTS "queue_insert_own"    ON public.matchmaking_queue;
DROP POLICY IF EXISTS "queue_update_own"    ON public.matchmaking_queue;
DROP POLICY IF EXISTS "queue_delete_own"    ON public.matchmaking_queue;

CREATE POLICY "queue_select_public" ON public.matchmaking_queue FOR SELECT USING (true);
CREATE POLICY "queue_insert_own"    ON public.matchmaking_queue FOR INSERT
  WITH CHECK (username IN (SELECT username FROM public.players WHERE auth_id = auth.uid()));
CREATE POLICY "queue_update_own"    ON public.matchmaking_queue FOR UPDATE
  USING  (username IN (SELECT username FROM public.players WHERE auth_id = auth.uid()))
  WITH CHECK (username IN (SELECT username FROM public.players WHERE auth_id = auth.uid()));
CREATE POLICY "queue_delete_own"    ON public.matchmaking_queue FOR DELETE
  USING  (username IN (SELECT username FROM public.players WHERE auth_id = auth.uid()));

-- ─── active_matches ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "active_matches_select_public" ON public.active_matches;
DROP POLICY IF EXISTS "active_matches_insert_host"   ON public.active_matches;
DROP POLICY IF EXISTS "active_matches_update_host"   ON public.active_matches;
DROP POLICY IF EXISTS "active_matches_delete_host"   ON public.active_matches;

CREATE POLICY "active_matches_select_public" ON public.active_matches FOR SELECT USING (true);
CREATE POLICY "active_matches_insert_host"   ON public.active_matches FOR INSERT
  WITH CHECK (host_username IN (SELECT username FROM public.players WHERE auth_id = auth.uid()));
CREATE POLICY "active_matches_update_host"   ON public.active_matches FOR UPDATE
  USING  (host_username IN (SELECT username FROM public.players WHERE auth_id = auth.uid()))
  WITH CHECK (host_username IN (SELECT username FROM public.players WHERE auth_id = auth.uid()));
CREATE POLICY "active_matches_delete_host"   ON public.active_matches FOR DELETE
  USING  (host_username IN (SELECT username FROM public.players WHERE auth_id = auth.uid()));

-- ─── custom_rooms ─────────────────────────────────────────────────────────────
-- Tüm değişiklik işlemleri SECURITY DEFINER RPC'ler üzerinden yapılır.
DROP POLICY IF EXISTS "custom_rooms_select_public" ON public.custom_rooms;
DROP POLICY IF EXISTS "custom_rooms_insert_host"   ON public.custom_rooms;
DROP POLICY IF EXISTS "custom_rooms_update_host"   ON public.custom_rooms;
DROP POLICY IF EXISTS "custom_rooms_delete_host"   ON public.custom_rooms;

CREATE POLICY "custom_rooms_select_public" ON public.custom_rooms FOR SELECT USING (true);
CREATE POLICY "custom_rooms_insert_host"   ON public.custom_rooms FOR INSERT
  WITH CHECK (host_username IN (SELECT username FROM public.players WHERE auth_id = auth.uid()));
CREATE POLICY "custom_rooms_update_host"   ON public.custom_rooms FOR UPDATE
  USING  (host_username IN (SELECT username FROM public.players WHERE auth_id = auth.uid()))
  WITH CHECK (host_username IN (SELECT username FROM public.players WHERE auth_id = auth.uid()));
CREATE POLICY "custom_rooms_delete_host"   ON public.custom_rooms FOR DELETE
  USING  (host_username IN (SELECT username FROM public.players WHERE auth_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTLAR
-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Bu dosya Supabase SQL Editor'da her zaman güvenle yeniden çalıştırılabilir.
-- 2. Özel oda maçları ranked=false — match_history'ye kaydedilmez.
-- 3. custom_rooms.max_players: 2(1v1) · 4(2v2) · 6(3v3) · 8(4v4) · 10(5v5)
-- 4. room_leave: HOST çıkarsa oda SİLİNİR · GUEST çıkarsa slot BOŞALIR
-- 5. room_join_team: her takım maks max_players/2 oyuncu
-- 6. Realtime: Supabase Dashboard > Database > Replication'da
--      custom_rooms + players + match_history tablolarını etkinleştirin.
-- 7. Eski odaları temizlemek için: SELECT public.cleanup_stale_rooms();
-- 8. migration 002 ve 003 bu dosyaya dahil edildi — artık ayrıca çalıştırmanız gerekmez.
