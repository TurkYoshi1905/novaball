-- ═══════════════════════════════════════════════════════════════════════════════
-- NovaBall — Migration 003
-- Dosya: 20260614_003_room_leave_fix.sql
-- Açıklama: room_leave RPC davranışı düzeltmesi
--
--   ESKI DAVRANIŞ (migration 002):
--     - Herhangi bir oyuncu maç sırasında (status='playing') ayrılırsa → oda SİLİNİR
--
--   YENİ DAVRANIŞ:
--     - Host ayrılırsa  → oda SİLİNİR (status ne olursa olsun)
--     - Guest ayrılırsa → sadece takım slotu BOŞALIR, oda AÇIK KALIR
--     - Yeni oyuncu boş slota katılıp maça girebilir
--
--   Bu migration migration 001 üzerine uygulanabilir.
--   CREATE OR REPLACE ile güvenle yeniden çalıştırılabilir.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.room_leave(
  p_room_id  UUID,
  p_username TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_room     RECORD;
  v_new_red  JSONB;
  v_new_blue JSONB;
BEGIN
  -- ── Kimlik doğrulama ──────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM public.players WHERE username = p_username AND auth_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Yetkisiz işlem: kullanıcı doğrulanamadı.';
  END IF;

  SELECT * INTO v_room FROM public.custom_rooms WHERE id = p_room_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- ── HOST ayrılıyorsa: odayı tamamen sil ──────────────────────────────────
  -- Status ne olursa olsun (waiting / starting / playing) oda silinir.
  -- subscribeToRoom null döner → tüm guest'ler "Oda Kapandı" ekranını görür.
  IF v_room.host_username = p_username THEN
    DELETE FROM public.custom_rooms WHERE id = p_room_id;
    RETURN;
  END IF;

  -- ── GUEST ayrılıyorsa: sadece takımdan çıkar, oda AÇIK KALIR ─────────────
  -- Slot boşalır; yeni oyuncu gelip o slota katılabilir ve maça girebilir.
  v_new_red  := COALESCE(
    (SELECT jsonb_agg(e) FROM jsonb_array_elements(v_room.red_team)  e WHERE e->>'username' <> p_username),
    '[]'::JSONB
  );
  v_new_blue := COALESCE(
    (SELECT jsonb_agg(e) FROM jsonb_array_elements(v_room.blue_team) e WHERE e->>'username' <> p_username),
    '[]'::JSONB
  );

  -- Her iki takım da tamamen boşaldıysa odayı sil (temizlik)
  IF jsonb_array_length(v_new_red) + jsonb_array_length(v_new_blue) = 0 THEN
    DELETE FROM public.custom_rooms WHERE id = p_room_id;
  ELSE
    UPDATE public.custom_rooms
    SET red_team = v_new_red, blue_team = v_new_blue
    WHERE id = p_room_id;
  END IF;
END;
$$;

-- ─── Notlar ───────────────────────────────────────────────────────────────────
-- 1. Bu fonksiyon RLS politikasını bypass eder (SECURITY DEFINER).
-- 2. Migration 001 üzerine doğrudan uygulanabilir; 002 gerekmez.
-- 3. Oda tamamen boşalırsa (host gittikten sonra kimse kalmadıysa) güvenlik
--    için yine de silinir; bu senaryo teorik — host zaten yukarıda handle edildi.
