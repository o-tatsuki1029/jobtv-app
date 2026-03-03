-- トップページに表示する動画の「選択」のみ。admin がどの企業のどの動画をトップに載せるかと順番を指定。入稿ではなく既存の videos を参照する。
CREATE TABLE top_page_featured_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('short', 'documentary')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(video_id)
);

CREATE INDEX idx_top_page_featured_videos_kind_display_order ON top_page_featured_videos(kind, display_order);

ALTER TABLE top_page_featured_videos ENABLE ROW LEVEL SECURITY;

-- 公開: anon / authenticated は SELECT のみ（トップ表示用）
CREATE POLICY "Anyone can view top page featured videos"
  ON top_page_featured_videos FOR SELECT
  TO anon, authenticated
  USING (true);

-- admin は全操作可能
CREATE POLICY "Admins can do all on top page featured videos"
  ON top_page_featured_videos FOR ALL
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

COMMENT ON TABLE top_page_featured_videos IS 'トップページに表示する動画の選択。admin が選択した動画のみ表示。入稿ではなく既存の videos を参照する。';
COMMENT ON COLUMN top_page_featured_videos.kind IS 'short: 就活Shorts, documentary: 就活ドキュメンタリー';
COMMENT ON COLUMN top_page_featured_videos.display_order IS '表示順（昇順）';
