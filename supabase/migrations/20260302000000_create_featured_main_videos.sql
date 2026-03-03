-- トップページ「就活Shorts」「就活ドキュメンタリー」用。企業動画ではなく運営（admin）が入稿・順序指定。審査なし。
CREATE TABLE featured_main_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('short', 'documentary')),
  title TEXT NOT NULL,
  channel TEXT NOT NULL,
  thumbnail_url TEXT,
  video_url TEXT,
  streaming_url TEXT,
  duration TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_featured_main_videos_kind_display_order ON featured_main_videos(kind, display_order);

ALTER TABLE featured_main_videos ENABLE ROW LEVEL SECURITY;

-- 公開: anon / authenticated は SELECT のみ
CREATE POLICY "Anyone can view featured main videos"
  ON featured_main_videos FOR SELECT
  TO anon, authenticated
  USING (true);

-- admin は全操作可能
CREATE POLICY "Admins can do all on featured main videos"
  ON featured_main_videos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE featured_main_videos IS 'トップ掲載コンテンツ（就活Shorts・就活ドキュメンタリー）。admin 入稿・審査なし。';
COMMENT ON COLUMN featured_main_videos.kind IS 'short: 就活Shorts, documentary: 就活ドキュメンタリー';
COMMENT ON COLUMN featured_main_videos.channel IS '表示用チャネル名（運営が入力）';
COMMENT ON COLUMN featured_main_videos.display_order IS '表示順（昇順）';
