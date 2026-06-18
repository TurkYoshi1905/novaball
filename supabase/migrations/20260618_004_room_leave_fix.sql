-- ============================================================
-- NovaBall v0.1.2 — room_leave RPC Düzeltmesi
-- Dosya: 20260618_004_room_leave_fix.sql
-- Supabase SQL Editor'da çalıştır
--
-- SORUN: Guest ayrılınca odadaki diğer oyuncularda yansımıyordu.
-- Eski RPC yanlış JSONB sözdizimi kullanıyordu.
-- Bu migration, room_leave'i doğru şekilde yeniden tanımlar.
-- ============================================================

CREATE OR REPLACE FUNCTION room_leave(p_room_id uuid, p_username text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host text;
BEGIN
  SELECT host_username INTO v_host
    FROM custom_rooms
   WHERE id = p_room_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Host ayrılıyorsa odayı tamamen sil (tüm üyeler subscribeToRoom null alır → atılır)
  IF v_host = p_username THEN
    DELETE FROM custom_rooms WHERE id = p_room_id;
    RETURN;
  END IF;

  -- Normal üye: JSONB dizi filtresiyle kendi kaydını kaldır
  -- Bu UPDATE postgres_changes'ı tetikler → tüm subscribeToRoom dinleyicileri güncellenir
  UPDATE custom_rooms
     SET red_team  = COALESCE(
           (SELECT jsonb_agg(m)
              FROM jsonb_array_elements(red_team) AS m
             WHERE m->>'username' <> p_username),
           '[]'::jsonb
         ),
         blue_team = COALESCE(
           (SELECT jsonb_agg(m)
              FROM jsonb_array_elements(blue_team) AS m
             WHERE m->>'username' <> p_username),
           '[]'::jsonb
         )
   WHERE id = p_room_id;
END;
$$;

-- Yetki: tüm giriş yapmış kullanıcılar çağırabilir
GRANT EXECUTE ON FUNCTION room_leave(uuid, text) TO authenticated;
