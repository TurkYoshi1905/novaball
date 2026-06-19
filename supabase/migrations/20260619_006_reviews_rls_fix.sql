-- ============================================================
-- NovaBall: Review/Yorum RLS İzin Düzeltmesi
-- Sorun: auth.users tablosuna authenticated rolünün SELECT izni
--        yok — policy'ler çalışmıyor.
-- Çözüm: auth.users sorgusu yerine auth.jwt() kullan.
--        JWT session'dan okunur, ekstra izin gerektirmez.
-- ============================================================

-- ── game_reviews policy'lerini yenile ───────────────────────

DROP POLICY IF EXISTS "reviews_update_own"  ON game_reviews;
DROP POLICY IF EXISTS "reviews_delete_own"  ON game_reviews;

CREATE POLICY "reviews_update_own" ON game_reviews
  FOR UPDATE USING (
    username = (auth.jwt() -> 'user_metadata' ->> 'username')
  );

CREATE POLICY "reviews_delete_own" ON game_reviews
  FOR DELETE USING (
    username = (auth.jwt() -> 'user_metadata' ->> 'username')
  );

-- ── game_comments policy'lerini yenile ──────────────────────

DROP POLICY IF EXISTS "comments_delete_own" ON game_comments;

CREATE POLICY "comments_delete_own" ON game_comments
  FOR DELETE USING (
    username = (auth.jwt() -> 'user_metadata' ->> 'username')
  );

-- ── comment_votes policy'lerini yenile ──────────────────────

DROP POLICY IF EXISTS "votes_update_own" ON comment_votes;
DROP POLICY IF EXISTS "votes_delete_own" ON comment_votes;

CREATE POLICY "votes_update_own" ON comment_votes
  FOR UPDATE USING (
    username = (auth.jwt() -> 'user_metadata' ->> 'username')
  );

CREATE POLICY "votes_delete_own" ON comment_votes
  FOR DELETE USING (
    username = (auth.jwt() -> 'user_metadata' ->> 'username')
  );
