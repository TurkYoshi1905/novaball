-- ─────────────────────────────────────────────────────────────────────────────
-- NovaBall v0.0.7 — Ayarlar: Kullanıcı adı & görünen ad değiştirme RPC'leri
-- Supabase SQL Editor'da çalıştır (kümülatif olarak güvenle yeniden çalıştırılabilir)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. change_username ────────────────────────────────────────────────────────
-- Kullanıcı adını değiştirir: players, match_history ve auth metadata güncellenir.
-- Sadece oturum açmış ve o kullanıcı adına sahip olan kullanıcı çalıştırabilir.
CREATE OR REPLACE FUNCTION public.change_username(
  p_old_username TEXT,
  p_new_username TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  -- Çağıranın auth kimliğini al
  v_auth_id := auth.uid();
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Eski kullanıcı adının bu kullanıcıya ait olduğunu doğrula
  IF NOT EXISTS (
    SELECT 1 FROM public.players
    WHERE username = p_old_username AND auth_id = v_auth_id
  ) THEN
    RAISE EXCEPTION 'username_not_owned';
  END IF;

  -- Format kontrolü: 3-15 karakter, küçük harf / rakam / alt çizgi
  IF p_new_username !~ '^[a-z0-9_]{3,15}$' THEN
    RAISE EXCEPTION 'username_invalid_format';
  END IF;

  -- Yeni kullanıcı adı müsaitlik kontrolü
  IF EXISTS (SELECT 1 FROM public.players WHERE username = p_new_username) THEN
    RAISE EXCEPTION 'username_taken';
  END IF;

  -- players tablosunu güncelle
  UPDATE public.players
  SET username = p_new_username, updated_at = now()
  WHERE username = p_old_username;

  -- match_history: player_username referansları
  UPDATE public.match_history
  SET player_username = p_new_username
  WHERE player_username = p_old_username;

  -- match_history: opponent_name referansları
  UPDATE public.match_history
  SET opponent_name = p_new_username
  WHERE opponent_name = p_old_username;

  -- Auth user metadata'sını güncelle
  UPDATE auth.users
  SET raw_user_meta_data =
    raw_user_meta_data || jsonb_build_object('username', p_new_username)
  WHERE id = v_auth_id;
END;
$$;

-- ── 2. change_display_name ────────────────────────────────────────────────────
-- Görünen adı günceller. Yalnızca kendi kaydını güncelleyebilir.
CREATE OR REPLACE FUNCTION public.change_display_name(
  p_username        TEXT,
  p_new_display_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  v_auth_id := auth.uid();
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Sahiplik doğrulama
  IF NOT EXISTS (
    SELECT 1 FROM public.players
    WHERE username = p_username AND auth_id = v_auth_id
  ) THEN
    RAISE EXCEPTION 'username_not_owned';
  END IF;

  -- Uzunluk kontrolü
  IF length(trim(p_new_display_name)) = 0 OR length(p_new_display_name) > 32 THEN
    RAISE EXCEPTION 'display_name_invalid';
  END IF;

  UPDATE public.players
  SET display_name = p_new_display_name, updated_at = now()
  WHERE username = p_username;

  -- Auth metadata'sını da güncelle
  UPDATE auth.users
  SET raw_user_meta_data =
    raw_user_meta_data || jsonb_build_object('display_name', p_new_display_name)
  WHERE id = v_auth_id;
END;
$$;

-- ── İzinler ───────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.change_username     TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_display_name TO authenticated;
