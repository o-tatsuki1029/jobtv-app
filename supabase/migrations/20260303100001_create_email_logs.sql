-- email_logs: メール送付の不変監査ログ
-- 書き込みはサービスロール（createAdminClient）のみ。admin は SELECT のみ。

CREATE TABLE public.email_logs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name       text        NOT NULL,
  recipient_email     text        NOT NULL,
  subject             text        NOT NULL,
  status              text        NOT NULL CHECK (status IN ('sent', 'failed')),
  sendgrid_message_id text,
  error_message       text,
  slack_notified      boolean     NOT NULL DEFAULT false,
  variables_snapshot  jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.email_logs IS '不変の送付ログ。INSERT/UPDATE はサービスロールのみ。admin は SELECT のみ。';
COMMENT ON COLUMN public.email_logs.template_name  IS '送付時点でのテンプレート名スナップショット';
COMMENT ON COLUMN public.email_logs.variables_snapshot IS '送付時点でのレンダリング変数（デバッグ用）';

CREATE INDEX idx_email_logs_created_at    ON public.email_logs(created_at DESC);
CREATE INDEX idx_email_logs_template_name ON public.email_logs(template_name);
CREATE INDEX idx_email_logs_status        ON public.email_logs(status);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- admin は SELECT のみ。INSERT は RLS ポリシーなし（サービスロールが bypass）
CREATE POLICY "email_logs_admin_select"
  ON public.email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
