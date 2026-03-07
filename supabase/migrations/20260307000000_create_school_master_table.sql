-- school_master: 学校・学部・学科の統合マスタ（非正規化）
CREATE TABLE school_master (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_kcode TEXT NOT NULL,
  school_type TEXT NOT NULL,          -- 大学, 短期大学, 専門学校, 高専 等
  school_name TEXT NOT NULL,
  school_name_hira TEXT,
  prefecture TEXT,
  group_name TEXT,                    -- 旧帝大・早慶 / MARCH・関関同立 等 (NULL可)
  faculty_name TEXT,                  -- 学部名 (NULL = 学部情報なし)
  faculty_name_hira TEXT,
  department_name TEXT,               -- 学科名 (NULL = 学科情報なし)
  department_name_hira TEXT
);

-- RLS: 未認証ユーザー含め全員が SELECT 可能
ALTER TABLE school_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read school_master" ON school_master FOR SELECT USING (true);

-- 検索用インデックス (部分一致)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_school_master_school_name ON school_master USING gin(school_name gin_trgm_ops);
CREATE INDEX idx_school_master_school_hira ON school_master USING gin(school_name_hira gin_trgm_ops);
CREATE INDEX idx_school_master_faculty_name ON school_master USING gin(faculty_name gin_trgm_ops);
CREATE INDEX idx_school_master_faculty_hira ON school_master USING gin(faculty_name_hira gin_trgm_ops);
CREATE INDEX idx_school_master_dept_name ON school_master USING gin(department_name gin_trgm_ops);
CREATE INDEX idx_school_master_dept_hira ON school_master USING gin(department_name_hira gin_trgm_ops);
CREATE INDEX idx_school_master_kcode ON school_master (school_kcode);
