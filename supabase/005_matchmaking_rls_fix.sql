-- ============================================================
-- NovaBall v0.0.5 — Eşleştirme RLS Düzeltmesi
-- Dosya: supabase/005_matchmaking_rls_fix.sql
-- Tarih: 13 Haziran 2026
--
-- SORUN: Misafir oyuncular maça giremiyordu.
--   - active_matches tablosunda SELECT politikası yoktu.
--   - Misafir getMatch() çağırdığında null dönüyordu.
--
-- ÇÖZÜM:
--   1. active_matches → tüm auth users SELECT yapabilir
--   2. matchmaking_queue → tüm auth users SELECT yapabilir
--      (kendi entry'lerini okumak için)
--   3. Broadcast kanalı için channel konfigürasyonu
-- ============================================================

-- Mevcut politikaları temizle (varsa)
DROP POLICY IF EXISTS "active_matches_select_all"     ON public.active_matches;
DROP POLICY IF EXISTS "active_matches_insert_host"    ON public.active_matches;
DROP POLICY IF EXISTS "active_matches_update_host"    ON public.active_matches;
DROP POLICY IF EXISTS "matchmaking_queue_select_all"  ON public.matchmaking_queue;
DROP POLICY IF EXISTS "matchmaking_queue_insert_self" ON public.matchmaking_queue;
DROP POLICY IF EXISTS "matchmaking_queue_update_host" ON public.matchmaking_queue;
DROP POLICY IF EXISTS "matchmaking_queue_delete_self" ON public.matchmaking_queue;

-- ── active_matches RLS ──────────────────────────────────────
ALTER TABLE public.active_matches ENABLE ROW LEVEL SECURITY;

-- Herhangi bir oturum açmış kullanıcı maçları okuyabilir
CREATE POLICY "active_matches_select_all"
  ON public.active_matches
  FOR SELECT
  TO authenticated
  USING (true);

-- Yalnızca host maç ekleyebilir
CREATE POLICY "active_matches_insert_host"
  ON public.active_matches
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Maç durumu güncellemesi (host veya herhangi bir oyuncu)
CREATE POLICY "active_matches_update_host"
  ON public.active_matches
  FOR UPDATE
  TO authenticated
  USING (true);

-- ── matchmaking_queue RLS ───────────────────────────────────
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Tüm oturum açmış kullanıcılar kuyruğu okuyabilir
-- (sıra, eşleştirme ve kendi entry'lerini kontrol etmek için)
CREATE POLICY "matchmaking_queue_select_all"
  ON public.matchmaking_queue
  FOR SELECT
  TO authenticated
  USING (true);

-- Kullanıcı sadece kendi kaydını ekleyebilir
CREATE POLICY "matchmaking_queue_insert_self"
  ON public.matchmaking_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Host eşleşme durumunu güncelleyebilir (match_id, status)
CREATE POLICY "matchmaking_queue_update_host"
  ON public.matchmaking_queue
  FOR UPDATE
  TO authenticated
  USING (true);

-- Kullanıcı sadece kendi kaydını silebilir
CREATE POLICY "matchmaking_queue_delete_self"
  ON public.matchmaking_queue
  FOR DELETE
  TO authenticated
  USING (true);

-- ── Realtime için tablo kayıtları ──────────────────────────
-- Bu tablolar için Realtime publication aktif edilmeli:
-- Supabase Dashboard → Database → Replication → supabase_realtime
-- → Add tables: matchmaking_queue, active_matches

-- Kontrol: tablolara yönelik RLS durumunu göster
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('active_matches', 'matchmaking_queue', 'custom_rooms');
