-- Create video_category enum type
CREATE TYPE video_category AS ENUM ('main', 'short', 'documentary');

-- Create videos table (production)
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category video_category NOT NULL,
  status company_page_status NOT NULL DEFAULT 'closed',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create videos_draft table
CREATE TABLE videos_draft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  production_video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category video_category NOT NULL,
  draft_status draft_status NOT NULL DEFAULT 'draft',
  display_order INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_videos_company_id ON videos(company_id);
CREATE INDEX idx_videos_category ON videos(category);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_display_order ON videos(display_order);

CREATE INDEX idx_videos_draft_company_id ON videos_draft(company_id);
CREATE INDEX idx_videos_draft_production_video_id ON videos_draft(production_video_id);
CREATE INDEX idx_videos_draft_category ON videos_draft(category);
CREATE INDEX idx_videos_draft_status ON videos_draft(draft_status);
CREATE INDEX idx_videos_draft_display_order ON videos_draft(display_order);

-- Enable Row Level Security
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos_draft ENABLE ROW LEVEL SECURITY;

-- RLS Policies for videos table
-- Users can view videos from their company
CREATE POLICY "Users can view videos from their company"
  ON videos FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can update videos from their company
CREATE POLICY "Users can update videos from their company"
  ON videos FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admins can view all videos
CREATE POLICY "Admins can view all videos"
  ON videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for videos_draft table
-- Users can view drafts from their company
CREATE POLICY "Users can view drafts from their company"
  ON videos_draft FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can insert drafts for their company
CREATE POLICY "Users can insert drafts for their company"
  ON videos_draft FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can update drafts from their company
CREATE POLICY "Users can update drafts from their company"
  ON videos_draft FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can delete drafts from their company
CREATE POLICY "Users can delete drafts from their company"
  ON videos_draft FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admins can view all drafts
CREATE POLICY "Admins can view all drafts"
  ON videos_draft FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all drafts (for approval/rejection)
CREATE POLICY "Admins can update all drafts"
  ON videos_draft FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add comments for documentation
COMMENT ON TABLE videos IS '動画マスターテーブル（本番公開用）';
COMMENT ON TABLE videos_draft IS '動画下書きテーブル（審査用）';
COMMENT ON COLUMN videos.category IS 'main: メインビデオ, short: ショート動画, documentary: 動画';
COMMENT ON COLUMN videos_draft.category IS 'main: メインビデオ, short: ショート動画, documentary: 動画';


