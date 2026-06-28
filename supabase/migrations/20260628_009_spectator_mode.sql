-- ─── Spectator Mode — v0.1.9 ──────────────────────────────────────────────────
-- custom_rooms tablosuna spectator_count kolonu ekler ve
-- spectator_join / spectator_leave SECURITY DEFINER RPC'lerini tanımlar.
-- Bu sayede izleyiciler sayısı gerçek zamanlı olarak odalarda görünür.

-- 1. Kolon ekle
ALTER TABLE custom_rooms
  ADD COLUMN IF NOT EXISTS spectator_count INTEGER NOT NULL DEFAULT 0;

-- 2. spectator_join — izleyici sayısını 1 artırır
CREATE OR REPLACE FUNCTION spectator_join(p_room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE custom_rooms
  SET spectator_count = GREATEST(0, COALESCE(spectator_count, 0) + 1)
  WHERE id = p_room_id AND status IN ('waiting', 'playing');
END;
$$;

-- 3. spectator_leave — izleyici sayısını 1 azaltır (0'ın altına düşmez)
CREATE OR REPLACE FUNCTION spectator_leave(p_room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE custom_rooms
  SET spectator_count = GREATEST(0, COALESCE(spectator_count, 0) - 1)
  WHERE id = p_room_id;
END;
$$;

-- 4. reset_spectators — oda kapanınca sayacı sıfırlar (room_leave RPC'den çağrılır)
CREATE OR REPLACE FUNCTION reset_spectators(p_room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE custom_rooms SET spectator_count = 0 WHERE id = p_room_id;
END;
$$;

-- İzin: anon ve authenticated rollerin RPC'leri çağırabilmesi için GRANT
GRANT EXECUTE ON FUNCTION spectator_join(UUID)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION spectator_leave(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_spectators(UUID) TO anon, authenticated;
