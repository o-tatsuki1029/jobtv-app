-- email_templates: Admin が管理するメールテンプレート
-- 変数は {variable_name} 記法で本文・件名に埋め込む

CREATE TABLE public.email_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  description text,
  subject     text        NOT NULL,
  body_html   text        NOT NULL,
  body_text   text,
  variables   text[]      NOT NULL DEFAULT '{}',
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.email_templates IS 'Admin が管理する SendGrid メールテンプレート。変数は {variable_name} 記法。';
COMMENT ON COLUMN public.email_templates.name      IS 'ユニークなスラッグ: invite_recruiter | invite_team_member | signup_confirmation | password_reset';
COMMENT ON COLUMN public.email_templates.variables IS 'テンプレートで使用可能な変数名の一覧例: {first_name, invite_url}';

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- admin ロールのみ全操作可
CREATE POLICY "email_templates_admin_all"
  ON public.email_templates FOR ALL
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

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
