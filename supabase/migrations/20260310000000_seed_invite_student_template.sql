-- 学生招待メールテンプレート
INSERT INTO public.email_templates (name, description, subject, body_html, body_text, variables)
VALUES
  (
    'invite_student',
    '管理者が学生アカウントを新規作成した際に送る初期パスワード設定メール',
    '【JobTV】学生アカウントのご案内',
    '<!DOCTYPE html>
<html lang="ja">
<body style="font-family: sans-serif; color: #222; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="border-bottom: 2px solid #e60000; padding-bottom: 8px;">学生アカウントのご案内</h2>
  <p>{last_name} {first_name} 様</p>
  <p>JobTV に学生アカウントが作成されました。</p>
  <table style="border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">メール</td><td>{recipient_email}</td></tr>
  </table>
  <p>下記リンクから初期パスワードを設定してください（有効期限: 24時間）</p>
  <p style="margin: 24px 0;">
    <a href="{invite_url}" style="background:#e60000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">
      パスワードを設定する
    </a>
  </p>
  <p style="font-size:12px;color:#666;">リンクが機能しない場合は以下をブラウザに貼り付けてください：<br>{invite_url}</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#999;"><a href="{site_url}" style="color:#999;">JobTV</a></p>
</body>
</html>',
    '{last_name} {first_name} 様

JobTV に学生アカウントが作成されました。

メール: {recipient_email}

下記リンクから初期パスワードを設定してください（有効期限: 24時間）
{invite_url}

このメールに心当たりがない場合は無視してください。

JobTV {site_url}',
    ARRAY['first_name', 'last_name', 'invite_url', 'site_url', 'recipient_email']
  )
ON CONFLICT (name) DO NOTHING;
