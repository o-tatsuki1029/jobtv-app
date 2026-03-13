-- ============================================================
-- profiles テーブルの RLS ポリシー修正
--
-- 問題:
--   1. "Public profiles are viewable by everyone." が public ロール
--      (anon 含む) に全件 SELECT を許可 → 個人情報漏洩リスク
--   2. レガシーの public ロールポリシー (INSERT/UPDATE) が残存
--   3. authenticated ロールの重複ポリシーが複数存在
--
-- 修正内容:
--   - 危険な public SELECT ポリシーを削除
--   - レガシーの public INSERT/UPDATE ポリシーを削除
--   - 重複する authenticated ポリシーを削除
--
-- 修正後の残存ポリシー (5 件):
--   SELECT: "Authenticated users can view all profiles" (authenticated, true)
--   INSERT: "Admins can insert profiles" (authenticated, admin)
--   INSERT: "Users can insert their own profile" (authenticated, id = auth.uid())
--   UPDATE: "Admins can update all profiles" (authenticated, admin)
--   UPDATE: "Authenticated users can update their own profile" (authenticated, id = auth.uid())
-- ============================================================

-- 1. [CRITICAL] anon で全 profiles を読める危険なポリシーを削除
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- 2. "Authenticated users can view all profiles" で包含されるため冗長
DROP POLICY IF EXISTS "Authenticated users can view their own profile" ON public.profiles;

-- 3. レガシーの public ロール INSERT（authenticated 版と重複）
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;

-- 4. "Authenticated users can update their own profile" と重複
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 5. レガシーの public ロール UPDATE（authenticated 版と重複）
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
