-- =============================================================================
-- セキュリティ修正: Storage ポリシー強化
-- H-5: company-assets バケットのパスベースアクセス制御
-- =============================================================================

BEGIN;

-- 既存の書き込みポリシーを DROP（認証ユーザー全員に許可していた）
DROP POLICY IF EXISTS "Authenticated users can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company assets" ON storage.objects;

-- Admin: company-assets の全パスに書き込み可能
CREATE POLICY "Admin can manage all company assets" ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Recruiter: 自社フォルダ（companies/{company_id}/...）のみ書き込み可能
CREATE POLICY "Recruiters can manage own company assets" ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = 'companies'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'recruiter'
        AND profiles.company_id::text = (storage.foldername(name))[2]
    )
  )
  WITH CHECK (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = 'companies'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'recruiter'
        AND profiles.company_id::text = (storage.foldername(name))[2]
    )
  );

-- 公開 SELECT ポリシー（"Anyone can view company assets"）はそのまま維持

COMMIT;
