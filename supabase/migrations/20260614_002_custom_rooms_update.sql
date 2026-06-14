-- ═══════════════════════════════════════════════════════════════════════════════
-- NovaBall — Migration 002
-- Dosya: 20260614_002_custom_rooms_update.sql
-- Açıklama: Özel oda sistemi güncellemesi
--   1. custom_rooms.max_players varsayılan değeri 2 → 10
--   2. max_players CHECK kısıtı 2–10 arası çift sayılar
--   3. Oda boşaltma fonksiyonu güncellendi (her oyuncu çıkınca oda silinir)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── custom_rooms max_players güncelleme ─────────────────────────────────────
-- Oyuncular artık 1v1 / 2v2 / 3v3 / 4v4 / 5v5 seçebilir (HaxBall gibi).
-- max_players: 2 (1v1), 4 (2v2), 6 (3v3), 8 (4v4), 10 (5v5)

ALTER TABLE public.custom_rooms
  ALTER COLUMN max_players SET DEFAULT 10;

-- max_players sadece çift sayı ve 2–10 aralığında olabilir
ALTER TABLE public.custom_rooms
  DROP CONSTRAINT IF EXISTS custom_rooms_max_players_check;

ALTER TABLE public.custom_rooms
  ADD CONSTRAINT custom_rooms_max_players_check
  CHECK (max_players IN (2, 4, 6, 8, 10));

-- ─── Her takım boyutunu kontrol eden yardımcı fonksiyon ──────────────────────
-- Her takım en fazla max_players / 2 oyuncu alabilir.
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

-- ─── room_join_team RPC güncelleme ───────────────────────────────────────────
-- Takım doluluğunu max_players / 2'ye göre kontrol et.
CREATE OR REPLACE FUNCTION public.room_join_team(
  p_room_id      UUID,
  p_username     TEXT,
  p_display_name TEXT,
  p_team         TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_room       RECORD;
  v_member     JSONB;
  v_new_red    JSONB;
  v_new_blue   JSONB;
  v_max_team   INTEGER;
  v_target_len INTEGER;
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

  -- Kullanıcıyı her iki takımdan çıkar
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

-- ─── room_leave RPC güncelleme ────────────────────────────────────────────────
-- Herhangi bir oyuncu ayrılınca (maç sırasında da) oda silinir.
-- Bu, "özel maçta bir oyuncu çıkınca oda boşalsın" gereksinimidir.
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

  -- Maç oynanıyor veya host ayrılıyorsa: odayı tamamen sil
  IF v_room.status IN ('playing', 'starting') OR v_room.host_username = p_username THEN
    DELETE FROM public.custom_rooms WHERE id = p_room_id;
    RETURN;
  END IF;

  -- Bekleme aşamasında normal çıkış
  v_new_red  := COALESCE((SELECT jsonb_agg(e) FROM jsonb_array_elements(v_room.red_team)  e WHERE e->>'username' <> p_username), '[]'::JSONB);
  v_new_blue := COALESCE((SELECT jsonb_agg(e) FROM jsonb_array_elements(v_room.blue_team) e WHERE e->>'username' <> p_username), '[]'::JSONB);

  IF jsonb_array_length(v_new_red) + jsonb_array_length(v_new_blue) = 0 THEN
    DELETE FROM public.custom_rooms WHERE id = p_room_id;
  ELSE
    UPDATE public.custom_rooms SET red_team = v_new_red, blue_team = v_new_blue WHERE id = p_room_id;
  END IF;
END;
$$;

-- ─── Notlar ───────────────────────────────────────────────────────────────────
-- 1. max_players varsayılanı artık 10 (5v5) — HaxBall gibi.
-- 2. Her takım maks max_players/2 oyuncu alır (trigger ile de doğrulanır).
-- 3. Maç sırasında (status='playing') herhangi bir oyuncu ayrılınca oda silinir.
--    Bu sayede rakip de otomatik olarak lobiye dönüş alır (subscribeToRoom null döner).
-- 4. Format eşleştirmesi:
--    max_players=2  → 1v1 (maks 1 per team)
--    max_players=4  → 2v2 (maks 2 per team)
--    max_players=6  → 3v3 (maks 3 per team)
--    max_players=8  → 4v4 (maks 4 per team)
--    max_players=10 → 5v5 (maks 5 per team)
