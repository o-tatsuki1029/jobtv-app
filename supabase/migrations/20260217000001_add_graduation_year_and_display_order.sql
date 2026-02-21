-- sessions_draftテーブルにgraduation_yearとdisplay_orderカラムを追加
ALTER TABLE sessions_draft
ADD COLUMN graduation_year integer,
ADD COLUMN display_order integer DEFAULT 0;

-- sessionsテーブルにgraduation_yearとdisplay_orderカラムを追加
ALTER TABLE sessions
ADD COLUMN graduation_year integer,
ADD COLUMN display_order integer DEFAULT 0;

-- job_postings_draftテーブルにdisplay_orderカラムを追加
ALTER TABLE job_postings_draft
ADD COLUMN display_order integer DEFAULT 0;

-- job_postingsテーブルにdisplay_orderカラムを追加
ALTER TABLE job_postings
ADD COLUMN display_order integer DEFAULT 0;

-- display_orderにインデックスを作成（並び替えのパフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_sessions_draft_display_order ON sessions_draft(display_order);
CREATE INDEX IF NOT EXISTS idx_sessions_display_order ON sessions(display_order);
CREATE INDEX IF NOT EXISTS idx_job_postings_draft_display_order ON job_postings_draft(display_order);
CREATE INDEX IF NOT EXISTS idx_job_postings_display_order ON job_postings(display_order);

-- graduation_yearにインデックスを作成（フィルタリングのパフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_sessions_draft_graduation_year ON sessions_draft(graduation_year);
CREATE INDEX IF NOT EXISTS idx_sessions_graduation_year ON sessions(graduation_year);

-- コメントを追加
COMMENT ON COLUMN sessions_draft.graduation_year IS '対象卒年度';
COMMENT ON COLUMN sessions_draft.display_order IS '表示順序（0から始まる整数、小さいほど先に表示）';
COMMENT ON COLUMN sessions.graduation_year IS '対象卒年度';
COMMENT ON COLUMN sessions.display_order IS '表示順序（0から始まる整数、小さいほど先に表示）';
COMMENT ON COLUMN job_postings_draft.display_order IS '表示順序（0から始まる整数、小さいほど先に表示）';
COMMENT ON COLUMN job_postings.display_order IS '表示順序（0から始まる整数、小さいほど先に表示）';


