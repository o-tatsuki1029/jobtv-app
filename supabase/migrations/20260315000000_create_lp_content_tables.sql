-- ============================================================
-- LP コンテンツ管理テーブル（サンプル動画・FAQ・企業ロゴ）
-- ============================================================

-- サンプル動画
CREATE TABLE lp_sample_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url text NOT NULL,
  tag text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  duration text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lp_sample_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view lp_sample_videos" ON lp_sample_videos
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin can manage lp_sample_videos" ON lp_sample_videos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- FAQ
CREATE TABLE lp_faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lp_faq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view lp_faq_items" ON lp_faq_items
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin can manage lp_faq_items" ON lp_faq_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 企業ロゴ
CREATE TABLE lp_company_logos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  row_position text NOT NULL DEFAULT 'top' CHECK (row_position IN ('top', 'bottom')),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lp_company_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view lp_company_logos" ON lp_company_logos
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin can manage lp_company_logos" ON lp_company_logos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ============================================================
-- シードデータ: FAQ 6問
-- ============================================================
INSERT INTO lp_faq_items (question, answer, display_order) VALUES
  ('既存の採用活動（ナビサイト、説明会など）と併用できますか？',
   'はい、併用可能です。むしろ既存の採用チャネルと連携することで、より効果的な母集団形成が可能になります。' || chr(10) || '動画で認知を高めた後にナビサイトへ誘導したり、説明会の告知を動画で行うなど、既存施策と組み合わせた戦略設計もサポートします。',
   0),
  ('社内に動画のノウハウがないのですが大丈夫でしょうか？',
   '問題ございません。' || chr(10) || '企画〜撮影〜編集〜配信設計までワンストップでサポートいたします。' || chr(10) || '台本作成や出演者へのディレクションも弊社側で行うため、専任担当がいなくても問題ありません。',
   1),
  ('SNSアカウントの運用もお願いできますか？',
   'はい、可能です。既存アカウントの運用代行、新規アカウント立ち上げの双方に対応しています。' || chr(10) || '月次でレポートと改善提案もご提出します。',
   2),
  ('動画の制作本数や配信頻度はどのくらいですか？',
   'ご予算や目標設定により、最適な更新頻度をご提案いたします。' || chr(10) || '貴社の採用スケジュールに合わせて柔軟な配信設計が可能です。',
   3),
  ('効果測定や分析はどのように行いますか？',
   '各SNSプラットフォームの分析データをレポート化し、改善提案を行います。' || chr(10) || '再生数、エンゲージメント率、応募経路の分析など、採用活動に直結する指標を可視化します。' || chr(10) || '定期的な振り返りミーティングで、施策の効果を確認しながら改善を重ねていきます。',
   4),
  ('開始までのスケジュールを教えてください。',
   '初回のオンライン打ち合わせから最短2週間で初回動画の公開が可能です。' || chr(10) || '撮影の有無や本数によって変動しますので、まずはご希望のスケジュールをお聞かせください。',
   5);

-- ============================================================
-- シードデータ: 企業ロゴ 78社
-- ============================================================
-- 上段 (39社)
INSERT INTO lp_company_logos (name, image_url, row_position, display_order) VALUES
  ('産業技術総合研究所', '/service/recruitment-marketing/images/logos/産業技術総合研究所.jpg', 'top', 0),
  ('都城市役所', '/service/recruitment-marketing/images/logos/都城市役所.jpg', 'top', 1),
  ('阪神グループ', '/service/recruitment-marketing/images/logos/阪神グループ.jpg', 'top', 2),
  ('株式会社電通', '/service/recruitment-marketing/images/logos/株式会社電通.jpg', 'top', 3),
  ('江崎グリコ株式会社', '/service/recruitment-marketing/images/logos/江崎グリコ株式会社.jpg', 'top', 4),
  ('王子ホールディングス株式会社', '/service/recruitment-marketing/images/logos/王子ホールディングス株式会社.jpg', 'top', 5),
  ('株式会社三井住友銀行', '/service/recruitment-marketing/images/logos/株式会社三井住友銀行.jpg', 'top', 6),
  ('株式会社明光ネットワークジャパン', '/service/recruitment-marketing/images/logos/株式会社明光ネットワークジャパン.jpg', 'top', 7),
  ('株式会社電算システム', '/service/recruitment-marketing/images/logos/株式会社電算システム.jpg', 'top', 8),
  ('株式会社マネージビジネス', '/service/recruitment-marketing/images/logos/株式会社マネージビジネス.jpg', 'top', 9),
  ('株式会社ミクシィ', '/service/recruitment-marketing/images/logos/株式会社ミクシィ.jpg', 'top', 10),
  ('株式会社リブ・コンサルティング', '/service/recruitment-marketing/images/logos/株式会社リブ・コンサルティング.jpg', 'top', 11),
  ('株式会社ホリプロ', '/service/recruitment-marketing/images/logos/株式会社ホリプロ.jpg', 'top', 12),
  ('株式会社ポニーキャニオン', '/service/recruitment-marketing/images/logos/株式会社ポニーキャニオン.jpg', 'top', 13),
  ('株式会社マイクロアド', '/service/recruitment-marketing/images/logos/株式会社マイクロアド.jpg', 'top', 14),
  ('株式会社フルキャストホールディングス', '/service/recruitment-marketing/images/logos/株式会社フルキャストホールディングス.jpg', 'top', 15),
  ('株式会社ベクトル', '/service/recruitment-marketing/images/logos/株式会社ベクトル.jpg', 'top', 16),
  ('株式会社ハイテックシステムズ', '/service/recruitment-marketing/images/logos/株式会社ハイテックシステムズ.jpg', 'top', 17),
  ('株式会社ハッチ・ワーク', '/service/recruitment-marketing/images/logos/株式会社ハッチ・ワーク.jpg', 'top', 18),
  ('株式会社ニューステクノロジー', '/service/recruitment-marketing/images/logos/株式会社ニューステクノロジー.jpg', 'top', 19),
  ('株式会社パルコ', '/service/recruitment-marketing/images/logos/株式会社パルコ.jpg', 'top', 20),
  ('株式会社ケアリッツ・アンド・パートナーズ', '/service/recruitment-marketing/images/logos/株式会社ケアリッツ・アンド・パートナーズ.jpg', 'top', 21),
  ('株式会社スギ薬局', '/service/recruitment-marketing/images/logos/株式会社スギ薬局.jpg', 'top', 22),
  ('株式会社オープンハウス', '/service/recruitment-marketing/images/logos/株式会社オープンハウス.jpg', 'top', 23),
  ('株式会社グランバー東京ラスク', '/service/recruitment-marketing/images/logos/株式会社グランバー東京ラスク.jpg', 'top', 24),
  ('株式会社アールナイン', '/service/recruitment-marketing/images/logos/株式会社アールナイン.jpg', 'top', 25),
  ('株式会社エフ・コード', '/service/recruitment-marketing/images/logos/株式会社エフ・コード.jpg', 'top', 26),
  ('株式会社アルファシステムズ', '/service/recruitment-marketing/images/logos/株式会社アルファシステムズ.jpg', 'top', 27),
  ('株式会社アルプス技研', '/service/recruitment-marketing/images/logos/株式会社アルプス技研.jpg', 'top', 28),
  ('株式会社アートリフォーム', '/service/recruitment-marketing/images/logos/株式会社アートリフォーム.jpg', 'top', 29),
  ('株式会社いえらぶGroup', '/service/recruitment-marketing/images/logos/株式会社いえらぶGroup.jpg', 'top', 30),
  ('株式会社すき家', '/service/recruitment-marketing/images/logos/株式会社すき家.jpg', 'top', 31),
  ('株式会社アイドマ・ホールディングス', '/service/recruitment-marketing/images/logos/株式会社アイドマ・ホールディングス.jpg', 'top', 32),
  ('株式会社Speee', '/service/recruitment-marketing/images/logos/株式会社Speee.jpg', 'top', 33),
  ('株式会社TAKUTO', '/service/recruitment-marketing/images/logos/株式会社TAKUTO.jpg', 'top', 34),
  ('株式会社あきんどスシロー', '/service/recruitment-marketing/images/logos/株式会社あきんどスシロー.jpg', 'top', 35),
  ('株式会社PR TIMES', '/service/recruitment-marketing/images/logos/株式会社PR TIMES.jpg', 'top', 36),
  ('株式会社Plan･Do･See', '/service/recruitment-marketing/images/logos/株式会社Plan･Do･See.jpg', 'top', 37),
  ('松竹株式会社', '/service/recruitment-marketing/images/logos/松竹株式会社.jpg', 'top', 38),
  ('株式会社CIRCUS', '/service/recruitment-marketing/images/logos/株式会社CIRCUS.jpg', 'top', 39);

-- 下段 (38社)
INSERT INTO lp_company_logos (name, image_url, row_position, display_order) VALUES
  ('株式会社NewsTV', '/service/recruitment-marketing/images/logos/株式会社NewsTV.jpg', 'bottom', 0),
  ('日本郵船株式会社', '/service/recruitment-marketing/images/logos/日本郵船株式会社.jpg', 'bottom', 1),
  ('東和産業株式会社', '/service/recruitment-marketing/images/logos/東和産業株式会社.jpg', 'bottom', 2),
  ('亀田製菓株式会社', '/service/recruitment-marketing/images/logos/亀田製菓株式会社.jpg', 'bottom', 3),
  ('公正取引委員会', '/service/recruitment-marketing/images/logos/公正取引委員会.jpg', 'bottom', 4),
  ('川元建設株式会社', '/service/recruitment-marketing/images/logos/川元建設株式会社.jpg', 'bottom', 5),
  ('三井化学株式会社', '/service/recruitment-marketing/images/logos/三井化学株式会社.jpg', 'bottom', 6),
  ('三菱自動車工業株式会社', '/service/recruitment-marketing/images/logos/三菱自動車工業株式会社.jpg', 'bottom', 7),
  ('ロート製薬株式会社', '/service/recruitment-marketing/images/logos/ロート製薬株式会社.jpg', 'bottom', 8),
  ('三井不動産株式会社', '/service/recruitment-marketing/images/logos/三井不動産株式会社.jpg', 'bottom', 9),
  ('ライク株式会社', '/service/recruitment-marketing/images/logos/ライク株式会社.jpg', 'bottom', 10),
  ('リック株式会社', '/service/recruitment-marketing/images/logos/リック株式会社.jpg', 'bottom', 11),
  ('マツダ株式会社', '/service/recruitment-marketing/images/logos/マツダ株式会社.jpg', 'bottom', 12),
  ('ヤフー株式会社', '/service/recruitment-marketing/images/logos/ヤフー株式会社.jpg', 'bottom', 13),
  ('ブラザー工業', '/service/recruitment-marketing/images/logos/ブラザー工業.jpg', 'bottom', 14),
  ('ホーユー株式会社', '/service/recruitment-marketing/images/logos/ホーユー株式会社.jpg', 'bottom', 15),
  ('ヒューマンライフケア株式会社', '/service/recruitment-marketing/images/logos/ヒューマンライフケア株式会社.jpg', 'bottom', 16),
  ('ブックオフコーポレーション株式会社', '/service/recruitment-marketing/images/logos/ブックオフコーポレーション株式会社.jpg', 'bottom', 17),
  ('バリューマネジメント株式会社', '/service/recruitment-marketing/images/logos/バリューマネジメント株式会社.jpg', 'bottom', 18),
  ('ビットスター株式会社', '/service/recruitment-marketing/images/logos/ビットスター株式会社.jpg', 'bottom', 19),
  ('セガサミーホールディングス株式会社', '/service/recruitment-marketing/images/logos/セガサミーホールディングス株式会社.jpg', 'bottom', 20),
  ('ソフトバンク株式会社', '/service/recruitment-marketing/images/logos/ソフトバンク株式会社.jpg', 'bottom', 21),
  ('ダイハツ工業株式会社', '/service/recruitment-marketing/images/logos/ダイハツ工業株式会社.jpg', 'bottom', 22),
  ('セイコーグループ株式会社', '/service/recruitment-marketing/images/logos/セイコーグループ株式会社.jpg', 'bottom', 23),
  ('スズキ株式会社', '/service/recruitment-marketing/images/logos/スズキ株式会社.jpg', 'bottom', 24),
  ('スマートキャンプ株式会社', '/service/recruitment-marketing/images/logos/スマートキャンプ株式会社.jpg', 'bottom', 25),
  ('シチズン時計株式会社', '/service/recruitment-marketing/images/logos/シチズン時計株式会社.jpg', 'bottom', 26),
  ('アマゾンジャパン合同会社', '/service/recruitment-marketing/images/logos/アマゾンジャパン合同会社.jpg', 'bottom', 27),
  ('キリンホールディングス株式会社', '/service/recruitment-marketing/images/logos/キリンホールディングス株式会社.jpg', 'bottom', 28),
  ('コクヨ株式会社', '/service/recruitment-marketing/images/logos/コクヨ株式会社.jpg', 'bottom', 29),
  ('みずほリサーチ&テクノロジーズ株式会社', '/service/recruitment-marketing/images/logos/みずほリサーチ&テクノロジーズ株式会社.jpg', 'bottom', 30),
  ('アイリスオーヤマ株式会社', '/service/recruitment-marketing/images/logos/アイリスオーヤマ株式会社.jpg', 'bottom', 31),
  ('KDDI株式会社', '/service/recruitment-marketing/images/logos/KDDI株式会社.jpg', 'bottom', 32),
  ('RIZAPグループ株式会社', '/service/recruitment-marketing/images/logos/RIZAPグループ株式会社.jpg', 'bottom', 33),
  ('GMOアドパートナーズ株式会社', '/service/recruitment-marketing/images/logos/GMOアドパートナーズ株式会社.jpg', 'bottom', 34),
  ('HRクラウド株式会社', '/service/recruitment-marketing/images/logos/HRクラウド株式会社.jpg', 'bottom', 35),
  ('ENEOS株式会社', '/service/recruitment-marketing/images/logos/ENEOS株式会社.jpg', 'bottom', 36),
  ('AnyMind Japan株式会社', '/service/recruitment-marketing/images/logos/AnyMind Japan株式会社.jpg', 'bottom', 37);
