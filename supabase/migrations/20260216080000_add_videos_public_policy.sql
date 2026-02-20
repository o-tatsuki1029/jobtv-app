-- Allow anyone to view active videos
CREATE POLICY "Anyone can view active videos"
  ON videos FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

