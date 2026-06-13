-- NovaBall: Şifre Sıfırlama — Supabase Auth Konfigürasyonu
-- Bu dosyada çalıştırılacak SQL yoktur.
-- Şifre sıfırlama Supabase Auth katmanında gerçekleşir; tablo şeması değişikliği gerekmez.
--
-- ─── Yapılacak Dashboard Ayarları ────────────────────────────────────────────
--
-- Supabase Dashboard → Authentication → URL Configuration:
--
-- 1. Site URL:
--    https://<REPLIT_APP_ID>.replit.app/
--    (veya geliştirme için Replit preview URL'si)
--
-- 2. Redirect URLs (Additional):
--    https://<REPLIT_APP_ID>.replit.app/**
--    http://localhost:*/**         (geliştirme için)
--
-- Bu ayarlar olmadan şifre sıfırlama e-postasındaki link,
-- Supabase'in Site URL'sine yönlendirir (yanlış URL).
--
-- ─── Supabase Management API ile otomatik güncelleme ─────────────────────────
-- Aşağıdaki komutu çalıştır (SUPABASE_ACCESS_TOKEN gerektirir):
--
--   SUPABASE_ACCESS_TOKEN=<token> VITE_SUPABASE_URL=<url> node supabase/update-redirect-urls.mjs
--
-- ─── Doğrulama sorgusu ───────────────────────────────────────────────────────
-- (Supabase SQL Editor'da opsiyonel olarak çalıştırılabilir)
SELECT
  'password reset config is auth-level, no schema changes needed' AS note,
  NOW() AS checked_at;
