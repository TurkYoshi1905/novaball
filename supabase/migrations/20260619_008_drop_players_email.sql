-- ============================================================
-- NovaBall: players.email kolonu kaldırma
-- SORUN: REVOKE COLUMN Supabase/PostgREST'de tablo-düzey GRANT'i
--        geçemez — email hâlâ anon key ile okunabiliyordu.
-- ÇÖZÜM: email kolonunu players tablosundan tamamen kaldır.
--        Canonical kaynak = auth.users.email (korumalı, sadece
--        service_role erişebilir).
-- ============================================================

-- 1. verify_username_email → auth.users'dan okuyacak şekilde güncelle
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
  v_auth_id      UUID;
  v_stored_email TEXT;
BEGIN
  -- Kullanıcı adına göre auth_id'yi players'dan al
  SELECT auth_id INTO v_auth_id
  FROM public.players
  WHERE username = p_username;

  IF v_auth_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- E-postayı korumalı auth.users tablosundan al (SECURITY DEFINER yetkisi ile)
  SELECT email INTO v_stored_email
  FROM auth.users
  WHERE id = v_auth_id;

  IF v_stored_email IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN lower(trim(v_stored_email)) = lower(trim(p_email));
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_username_email(text, text) TO anon, authenticated;

-- 2. create_player — artık email parametresi almıyor
--    (email canonical olarak auth.users'da yaşar)
CREATE OR REPLACE FUNCTION public.create_player(
  p_username     text,
  p_display_name text,
  p_auth_id      uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.players(username, display_name, auth_id, rp)
  VALUES (p_username, p_display_name, p_auth_id, 0)
  ON CONFLICT (username) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_player(text, text, uuid) TO anon, authenticated;

-- 3. Eski create_player(text,text,text,uuid) imzasını kaldır
DROP FUNCTION IF EXISTS public.create_player(text, text, text, uuid);

-- 4. players tablosundan email kolonunu kaldır
ALTER TABLE public.players DROP COLUMN IF EXISTS email;

-- ============================================================
-- Sonuç: players tablosunda artık email kolonu yok.
-- E-posta yalnızca auth.users içinde, service_role erişimiyle korunur.
-- verify_username_email(username, email) → auth.users üzerinden doğrular.
-- ============================================================
