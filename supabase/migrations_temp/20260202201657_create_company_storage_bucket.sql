-- 企業プロフィール用のSupabase Storageバケット作成
-- company-assetsバケット: 企業のロゴ、カバー画像、メッセージ画像、動画を保存

-- バケットを作成（公開バケット）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- RLSポリシー: 認証済みユーザーのみアップロード可能
CREATE POLICY "Authenticated users can upload company assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');

-- RLSポリシー: 認証済みユーザーのみ更新可能
CREATE POLICY "Authenticated users can update company assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'company-assets');

-- RLSポリシー: 認証済みユーザーのみ削除可能
CREATE POLICY "Authenticated users can delete company assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'company-assets');

-- RLSポリシー: 全員が閲覧可能（公開バケット）
CREATE POLICY "Anyone can view company assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-assets');

