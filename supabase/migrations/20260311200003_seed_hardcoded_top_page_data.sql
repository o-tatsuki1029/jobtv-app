-- Seed existing hardcoded ambassador data
INSERT INTO top_page_ambassadors (name, avatar_url, link_url, display_order) VALUES
  ('企業研究ナビ', '/shorts-icon/shukatsu_kigyokenkyuu.jpeg', 'https://www.tiktok.com/@shukatsu_kigyokenkyuu', 0),
  ('就活おかP', '/shorts-icon/shukatsu_okap.jpeg', 'https://www.tiktok.com/@shukatsu_okap', 1),
  ('りな先生の業界入門✏️', '/shorts-icon/shukatsu_gyoukaikenkyuu.jpeg', 'https://www.tiktok.com/@shukatsu_gyoukaikenkyuu', 2),
  ('JOBTV会社図鑑', '/shorts-icon/jobtv_zukan.jpeg', 'https://www.tiktok.com/@jobtv_zukan', 3),
  ('JOBTV企業ガイド', '/shorts-icon/jobtv_kigyogaido.jpeg', 'https://www.tiktok.com/@jobtv_kigyogaido', 4),
  ('JOBTV Voice / 社員の声', '/shorts-icon/jobtv_voice.jpeg', 'https://www.tiktok.com/@jobtv_voice', 5),
  ('JOBTV Real / 社員の１日', '/shorts-icon/jobtv__real.jpeg', 'https://www.tiktok.com/@jobtv__real', 6),
  ('JOBTV Tour / オフィス図鑑', '/shorts-icon/jobtv_tour.jpeg', 'https://www.tiktok.com/@jobtv_tour', 7),
  ('JOBTV Guide / 企業名鑑', '/shorts-icon/jobtv_guide.jpeg', 'https://www.tiktok.com/@jobtv_guide', 8),
  ('JOBTV HR / 就活のヒント', '/shorts-icon/jobtv_hr.jpeg', 'https://www.tiktok.com/@jobtv_hr', 9);

-- Seed existing hardcoded shun diary data
INSERT INTO top_page_shun_diaries (title, thumbnail_url, link_url, display_order) VALUES
  ('就活対策動画 #1', '/shundiary/01.webp', NULL, 0),
  ('就活対策動画 #2', '/shundiary/02.webp', NULL, 1),
  ('就活対策動画 #3', '/shundiary/03.webp', NULL, 2),
  ('就活対策動画 #4', '/shundiary/04.webp', NULL, 3),
  ('就活対策動画 #5', '/shundiary/05.jpg', NULL, 4),
  ('就活対策動画 #6', '/shundiary/06.webp', NULL, 5),
  ('就活対策動画 #7', '/shundiary/07.jpg', NULL, 6),
  ('就活対策動画 #8', '/shundiary/08.jpg', NULL, 7),
  ('就活対策動画 #9', '/shundiary/09.webp', NULL, 8),
  ('就活対策動画 #10', '/shundiary/10.webp', NULL, 9);
