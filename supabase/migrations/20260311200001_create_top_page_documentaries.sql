CREATE TABLE top_page_documentaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  thumbnail_url text NOT NULL,
  link_url text,
  channel text NOT NULL DEFAULT 'JOBTV',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE top_page_documentaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view documentaries" ON top_page_documentaries
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin can manage documentaries" ON top_page_documentaries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
