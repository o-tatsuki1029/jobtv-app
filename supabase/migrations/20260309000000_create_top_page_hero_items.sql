CREATE TABLE top_page_hero_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  thumbnail_url text NOT NULL,
  video_url text,
  channel text NOT NULL DEFAULT 'JOBTV',
  viewers integer,
  is_pr boolean NOT NULL DEFAULT false,
  link_url text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE top_page_hero_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view hero items"
  ON top_page_hero_items FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "Admin can manage hero items"
  ON top_page_hero_items FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');
