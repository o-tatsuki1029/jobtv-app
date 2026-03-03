-- signup_confirmation は enable_confirmations=false のため不要なので削除
DELETE FROM public.email_templates WHERE name = 'signup_confirmation';

-- 学生アカウント作成時のサンクスメール
INSERT INTO public.email_templates (name, description, subject, body_html, body_text, variables)
VALUES (
  'candidate_welcome',
  '学生が会員登録を完了した際に自動送信されるサンクスメール',
  '【JobTV】会員登録が完了しました',
  '<!DOCTYPE html>
<html lang="ja">
<body style="font-family: sans-serif; color: #222; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="border-bottom: 2px solid #e60000; padding-bottom: 8px;">会員登録が完了しました</h2>
  <p>{last_name} {first_name} 様</p>
  <p>JobTV への会員登録ありがとうございます。<br>
  あなたのアカウントが正常に作成されました。</p>
  <p style="margin: 24px 0;">
    <a href="{site_url}" style="background:#e60000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">
      JobTV を見てみる
    </a>
  </p>
  <p>企業の動画を見たり、説明会に申し込んだりしてみましょう。</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#999;"><a href="{site_url}" style="color:#999;">JobTV</a></p>
</body>
</html>',
  '{last_name} {first_name} 様

JobTV への会員登録ありがとうございます。
アカウントが正常に作成されました。

JobTV を見てみる: {site_url}

企業の動画を見たり、説明会に申し込んだりしてみましょう。

JobTV {site_url}',
  ARRAY['first_name', 'last_name', 'site_url']
)
ON CONFLICT (name) DO NOTHING;
