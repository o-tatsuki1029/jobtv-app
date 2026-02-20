-- お知らせテーブルを作成
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info', -- 'success', 'info', 'warning', 'system'
  target_company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE, -- NULL の場合は全企業向け
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- お知らせ既読テーブルを作成
CREATE TABLE public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- インデックスを作成
CREATE INDEX idx_notifications_target_company_id ON public.notifications(target_company_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notification_reads_notification_id ON public.notification_reads(notification_id);
CREATE INDEX idx_notification_reads_user_id ON public.notification_reads(user_id);

-- RLSを有効化
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- お知らせの閲覧ポリシー（企業ユーザーは自分の企業向けまたは全体向けのお知らせを閲覧可能）
CREATE POLICY "Company users can view their notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    target_company_id IS NULL OR
    target_company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 管理者はすべてのお知らせを閲覧・作成・更新・削除可能
CREATE POLICY "Admins can manage all notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 既読情報の閲覧（自分の既読情報のみ）
CREATE POLICY "Users can view their own reads"
  ON public.notification_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 既読情報の作成（自分の既読情報のみ）
CREATE POLICY "Users can insert their own reads"
  ON public.notification_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 既読情報の削除（自分の既読情報のみ）
CREATE POLICY "Users can delete their own reads"
  ON public.notification_reads FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

