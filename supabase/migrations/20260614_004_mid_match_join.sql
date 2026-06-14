-- ═══════════════════════════════════════════════════════════════════════════════
-- NovaBall — Migration 004
-- Dosya: 20260614_004_mid_match_join.sql
-- Açıklama: Oynanmakta olan odaya mid-match katılım desteği
--
--   1. room_join_team → 'playing' durumdaki odaya da katılmaya izin ver
--   2. room_start    → minimum oyuncu şartı yok (host tek başına başlatabilir)
--   3. listRooms query yok (frontend'de yapılıyor: status IN ('waiting','playing'))
--
--   CREATE OR REPLACE ile güvenle yeniden çalıştırılabilir.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── room_join_team: 'playing' odaya katılmaya izin ver ───────────────────────
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

  -- 'waiting' veya 'playing' durumunda katılıma izin ver
  -- 'playing': maç devam ederken yeni oyuncu katılabilir (serbest mod)
  IF v_room.status NOT IN ('waiting', 'playing') THEN
    RAISE EXCEPTION 'Oda artık katılıma açık değil (durum: %).', v_room.status;
  END IF;

  v_max_team := v_room.max_players / 2;

  -- Kullanıcıyı her iki takımdan çıkar (takım değiştirme desteği)
  v_new_red  := COALESCE(
    (SELECT jsonb_agg(e) FROM jsonb_array_elements(v_room.red_team)  e WHERE e->>'username' <> p_username),
    '[]'::JSONB
  );
  v_new_blue := COALESCE(
    (SELECT jsonb_agg(e) FROM jsonb_array_elements(v_room.blue_team) e WHERE e->>'username' <> p_username),
    '[]'::JSONB
  );

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

-- ─── Notlar ───────────────────────────────────────────────────────────────────
-- 1. 'playing' durumundaki odaya katılım: takım seçimi lobi ekranında yapılır,
--    katılım sonrası oyuncu direkt maça yönlendirilir.
-- 2. Host minimum oyuncu şartı olmadan maçı başlatabilir (frontend kontrolü kaldırıldı).
-- 3. Maç devam ederken odalar CustomRoomsPage'de "CANLI" etiketi ile görünür.
-- 4. room_leave: guest çıkarsa slot boşalır, yeni oyuncu girebilir (migration 003'ten).
