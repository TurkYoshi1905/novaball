-- ============================================================
-- NovaBall: Yorum & Değerlendirme Sistemi
-- ============================================================

-- Oyun değerlendirmeleri (kullanıcı başına bir puan)
CREATE TABLE IF NOT EXISTS game_reviews (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  username     text        NOT NULL UNIQUE,
  display_name text        NOT NULL,
  rating       integer     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at   timestamptz DEFAULT now() NOT NULL,
  updated_at   timestamptz DEFAULT now() NOT NULL
);

-- Yorumlar (parent_id varsa yanıt, yoksa ana yorum)
CREATE TABLE IF NOT EXISTS game_comments (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  username     text        NOT NULL,
  display_name text        NOT NULL,
  content      text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  parent_id    uuid        REFERENCES game_comments(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now() NOT NULL
);

-- Beğeni/beğenmeme oyları (her kullanıcı her yorum için bir oy)
CREATE TABLE IF NOT EXISTS comment_votes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES game_comments(id) ON DELETE CASCADE,
  username   text NOT NULL,
  vote_type  text NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  UNIQUE (comment_id, username)
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_game_comments_parent_id  ON game_comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_game_comments_created_at ON game_comments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON comment_votes (comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_username   ON comment_votes (username);

-- ── RLS Politikaları ────────────────────────────────────────────────────────

ALTER TABLE game_reviews  ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;

-- game_reviews: herkes okuyabilir; giriş yapmış kullanıcı kendi kaydını ekleyip güncelleyebilir
CREATE POLICY "reviews_select_all" ON game_reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert_auth" ON game_reviews
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "reviews_update_own" ON game_reviews
  FOR UPDATE USING (
    username = (
      SELECT raw_user_meta_data ->> 'username'
      FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "reviews_delete_own" ON game_reviews
  FOR DELETE USING (
    username = (
      SELECT raw_user_meta_data ->> 'username'
      FROM auth.users WHERE id = auth.uid()
    )
  );

-- game_comments: herkes okuyabilir; giriş yapmış kullanıcı ekleyebilir; sadece kendi yorumunu silebilir
CREATE POLICY "comments_select_all" ON game_comments
  FOR SELECT USING (true);

CREATE POLICY "comments_insert_auth" ON game_comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "comments_delete_own" ON game_comments
  FOR DELETE USING (
    username = (
      SELECT raw_user_meta_data ->> 'username'
      FROM auth.users WHERE id = auth.uid()
    )
  );

-- comment_votes: herkes okuyabilir; giriş yapmış kullanıcı kendi oyunu yönetebilir
CREATE POLICY "votes_select_all" ON comment_votes
  FOR SELECT USING (true);

CREATE POLICY "votes_insert_auth" ON comment_votes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "votes_update_own" ON comment_votes
  FOR UPDATE USING (
    username = (
      SELECT raw_user_meta_data ->> 'username'
      FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "votes_delete_own" ON comment_votes
  FOR DELETE USING (
    username = (
      SELECT raw_user_meta_data ->> 'username'
      FROM auth.users WHERE id = auth.uid()
    )
  );
