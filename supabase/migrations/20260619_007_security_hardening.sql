-- ============================================================
-- NovaBall: Kapsamlı Güvenlik Sertleştirmesi
-- Tespit edilen açıklar ve düzeltmeler:
--
-- [KRİTİK] players.email kolonu anon key ile herkese açık
-- [KRİTİK] get_email_by_username RPC — herkes başkasının e-postasını öğrenebilir
-- [YÜKSEK]  players UPDATE/INSERT politikası aşırı geniş
-- [YÜKSEK]  match_history INSERT: with_check=true — herkes sahte maç ekleyebilir
-- [ORTA]    custom_rooms hatalı policy: id = auth.uid() (UUID karşılaştırma hatası)
-- [ORTA]    forfeit_attempts: auth.users subquery → 42501 hatası
-- [DÜŞÜK]   Yinelenen/çakışan politikalar
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. E-POSTA SÜTUNU — KOLON DÜZEYİNDE ERİŞİM KISITLAMASI
--    PostgreSQL sütun ayrıcalıkları ile email anonlara/authenticated'a gizlenir.
--    SECURITY DEFINER fonksiyonlar hâlâ okuyabilir (login için gerekli).
-- ─────────────────────────────────────────────────────────────

REVOKE SELECT (email) ON public.players FROM anon;
REVOKE SELECT (email) ON public.players FROM authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. get_email_by_username KALDIR → verify_username_email İLE DEĞİŞTİR
--    Eski fonksiyon: e-postayı düz metin döndürüyor (tehlikeli).
--    Yeni fonksiyon: sadece eşleşme var/yok cevabı döndürüyor.
-- ─────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_email_by_username(text);

CREATE OR REPLACE FUNCTION public.verify_username_email(
  p_username text,
  p_email    text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_stored_email TEXT;
BEGIN
  SELECT email INTO v_stored_email
  FROM public.players
  WHERE username = p_username;

  IF v_stored_email IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Büyük/küçük harf duyarsız karşılaştırma
  RETURN lower(trim(v_stored_email)) = lower(trim(p_email));
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_username_email(text, text) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. players TABLOSU — FAZLA GENİŞ POLİTİKALARI KALDIR
-- ─────────────────────────────────────────────────────────────

-- Aşırı geniş INSERT politikaları kaldır (with_check = true)
DROP POLICY IF EXISTS "Oyuncu ekle"        ON public.players;
-- Aşırı geniş UPDATE politikası kaldır (qual=true, with_check=true — herkes herkesi güncelleyebilir!)
DROP POLICY IF EXISTS "Oyuncu güncelle"    ON public.players;
-- NULL auth_id'ye izin veren INSERT politikasını kaldır
DROP POLICY IF EXISTS "players_insert_own" ON public.players;
-- Yinelenen SELECT politikalarını temizle
DROP POLICY IF EXISTS "Oyuncuları oku"     ON public.players;
DROP POLICY IF EXISTS "players_select_public" ON public.players;

-- ─────────────────────────────────────────────────────────────
-- 4. match_history — SAHTE MAÇ EKLEME AÇIĞI KAPAT
-- ─────────────────────────────────────────────────────────────

-- "Maç ekle": with_check=true → herkes sahte maç ekleyebilir
DROP POLICY IF EXISTS "Maç ekle" ON public.match_history;

-- ─────────────────────────────────────────────────────────────
-- 5. custom_rooms — HATALALI POLİTİKA KALDIR
--    "Host can delete room": custom_rooms.id = auth.uid() — UUID karşılaştırma hatası
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Host can delete room" ON public.custom_rooms;

-- ─────────────────────────────────────────────────────────────
-- 6. active_matches — YİNELENEN POLİTİKALARI TEMİZLE
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "active_matches_select_all" ON public.active_matches;
DROP POLICY IF EXISTS "am_own_insert"             ON public.active_matches;
DROP POLICY IF EXISTS "am_own_update"             ON public.active_matches;
DROP POLICY IF EXISTS "am_public_read"            ON public.active_matches;

-- ─────────────────────────────────────────────────────────────
-- 7. forfeit_attempts — auth.users SUBQUERY → auth.jwt() ile düzelt
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "forfeit_attempts_insert_own" ON public.forfeit_attempts;

CREATE POLICY "forfeit_attempts_insert_own" ON public.forfeit_attempts
  FOR INSERT WITH CHECK (
    player_username = (auth.jwt() -> 'user_metadata' ->> 'username')
  );

-- ─────────────────────────────────────────────────────────────
-- 8. matchmaking_queue — YİNELENEN POLİTİKALARI TEMİZLE
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "queue_delete_own"    ON public.matchmaking_queue;
DROP POLICY IF EXISTS "queue_insert_own"    ON public.matchmaking_queue;
DROP POLICY IF EXISTS "queue_select_public" ON public.matchmaking_queue;
DROP POLICY IF EXISTS "queue_update_own"    ON public.matchmaking_queue;
DROP POLICY IF EXISTS "mq_own_delete"       ON public.matchmaking_queue;
DROP POLICY IF EXISTS "mq_own_insert"       ON public.matchmaking_queue;
DROP POLICY IF EXISTS "mq_own_update"       ON public.matchmaking_queue;
DROP POLICY IF EXISTS "mq_public_read"      ON public.matchmaking_queue;

-- ─────────────────────────────────────────────────────────────
-- 9. custom_rooms — YİNELENEN POLİTİKALARI TEMİZLE
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "custom_rooms_delete_host"   ON public.custom_rooms;
DROP POLICY IF EXISTS "custom_rooms_insert_host"   ON public.custom_rooms;
DROP POLICY IF EXISTS "custom_rooms_select_public" ON public.custom_rooms;
DROP POLICY IF EXISTS "custom_rooms_update_host"   ON public.custom_rooms;

-- ─────────────────────────────────────────────────────────────
-- 10. cleanup_stale_matches — SECURITY DEFINER + search_path sertleştir
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_stale_matches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM active_matches
  WHERE status IN ('starting', 'playing')
    AND created_at < NOW() - INTERVAL '2 hours';

  DELETE FROM matchmaking_queue
  WHERE joined_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- ÖZET: Kalan aktif politikalar (temizleme sonrası)
--
-- players:
--   SELECT → players_public_read (true, e-posta gizli via REVOKE)
--   INSERT → players_own_insert  (auth.uid() IS NOT NULL AND auth_id = auth.uid())
--   UPDATE → players_own_update  (auth_id = auth.uid())
--   DELETE → players_own_delete  (auth.uid() IS NOT NULL AND auth_id = auth.uid())
--
-- match_history:
--   SELECT → match_history_public_read, match_history_select_public
--   INSERT → match_history_insert_own, match_history_own_insert (auth gerekli)
--
-- active_matches:
--   SELECT → active_matches_select_public
--   INSERT → active_matches_insert_host (auth gerekli)
--   UPDATE → active_matches_update_host (auth gerekli)
--   DELETE → active_matches_delete_host (auth gerekli)
--
-- matchmaking_queue:
--   SELECT → matchmaking_queue_select_all (authenticated)
--   INSERT → matchmaking_queue_insert_self (authenticated)
--   UPDATE → matchmaking_queue_update_host (authenticated)
--   DELETE → matchmaking_queue_delete_self (authenticated)
--
-- custom_rooms:
--   SELECT → cr_public_read
--   INSERT → cr_own_insert (auth gerekli)
--   UPDATE → cr_own_update
--   DELETE → cr_own_delete (auth gerekli)
-- ─────────────────────────────────────────────────────────────
