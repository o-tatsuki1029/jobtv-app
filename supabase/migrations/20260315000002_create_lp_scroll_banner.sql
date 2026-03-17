CREATE TABLE IF NOT EXISTS lp_scroll_banner (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  link_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lp_scroll_banner ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view lp_scroll_banner" ON lp_scroll_banner
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin can manage lp_scroll_banner" ON lp_scroll_banner
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
