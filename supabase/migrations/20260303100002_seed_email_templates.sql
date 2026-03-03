-- 初期メールテンプレート 4 件
-- 変数は {variable_name} 記法

INSERT INTO public.email_templates (name, description, subject, body_html, body_text, variables)
VALUES
  (
    'invite_recruiter',
    '管理者が企業・リクルーターアカウントを新規作成した際に送る初期パスワード設定メール',
    '【JobTV】{company_name} リクルーターアカウントのご案内',
    '<!DOCTYPE html>
<html lang="ja">
<body style="font-family: sans-serif; color: #222; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="border-bottom: 2px solid #e60000; padding-bottom: 8px;">リクルーターアカウントのご案内</h2>
  <p>{last_name} {first_name} 様</p>
  <p>JobTV にリクルーターアカウントが作成されました。</p>
  <table style="border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">企業名</td><td>{company_name}</td></tr>
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

JobTV にリクルーターアカウントが作成されました。

企業名: {company_name}

下記リンクから初期パスワードを設定してください（有効期限: 24時間）
{invite_url}

このメールに心当たりがない場合は無視してください。

JobTV {site_url}',
    ARRAY['first_name', 'last_name', 'company_name', 'invite_url', 'site_url', 'recipient_email']
  ),
  (
    'invite_team_member',
    'リクルーターがスタジオからチームメンバーを招待した際のメール',
    '【JobTV】{company_name} チームへの招待',
    '<!DOCTYPE html>
<html lang="ja">
<body style="font-family: sans-serif; color: #222; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="border-bottom: 2px solid #e60000; padding-bottom: 8px;">チームへの招待</h2>
  <p>{last_name} {first_name} 様</p>
  <p>{company_name} のチームメンバーとして JobTV に招待されました。</p>
  <p>下記リンクからアカウントを有効化してください（有効期限: 24時間）</p>
  <p style="margin: 24px 0;">
    <a href="{invite_url}" style="background:#e60000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">
      アカウントを有効化する
    </a>
  </p>
  <p style="font-size:12px;color:#666;">リンクが機能しない場合は以下をブラウザに貼り付けてください：<br>{invite_url}</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#999;"><a href="{site_url}" style="color:#999;">JobTV</a></p>
</body>
</html>',
    '{last_name} {first_name} 様

{company_name} のチームメンバーとして JobTV に招待されました。

下記リンクからアカウントを有効化してください（有効期限: 24時間）
{invite_url}

JobTV {site_url}',
    ARRAY['first_name', 'last_name', 'company_name', 'invite_url', 'site_url']
  ),
  (
    'signup_confirmation',
    '候補者がサインアップした際の確認メール（Supabase Auth Hook 経由）',
    '【JobTV】メールアドレスの確認',
    '<!DOCTYPE html>
<html lang="ja">
<body style="font-family: sans-serif; color: #222; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="border-bottom: 2px solid #e60000; padding-bottom: 8px;">メールアドレスの確認</h2>
  <p>JobTV にご登録いただきありがとうございます。</p>
  <p>下記リンクからメールアドレスを確認してください（有効期限: 1時間）</p>
  <p style="margin: 24px 0;">
    <a href="{confirm_url}" style="background:#e60000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">
      メールアドレスを確認する
    </a>
  </p>
  <p style="font-size:13px;color:#555;">確認コード: <strong>{token}</strong></p>
  <p style="font-size:12px;color:#666;">リンクが機能しない場合は以下をブラウザに貼り付けてください：<br>{confirm_url}</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#999;"><a href="{site_url}" style="color:#999;">JobTV</a></p>
</body>
</html>',
    'JobTV にご登録いただきありがとうございます。

下記リンクからメールアドレスを確認してください（有効期限: 1時間）
{confirm_url}

確認コード: {token}

JobTV {site_url}',
    ARRAY['confirm_url', 'token', 'site_url']
  ),
  (
    'password_reset',
    'パスワードリセットリンクの送信メール（Supabase Auth Hook 経由）',
    '【JobTV】パスワードリセット',
    '<!DOCTYPE html>
<html lang="ja">
<body style="font-family: sans-serif; color: #222; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="border-bottom: 2px solid #e60000; padding-bottom: 8px;">パスワードリセット</h2>
  <p>パスワードリセットのリクエストを受け付けました。</p>
  <p>下記リンクから新しいパスワードを設定してください（有効期限: 1時間）</p>
  <p style="margin: 24px 0;">
    <a href="{confirm_url}" style="background:#e60000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">
      パスワードを再設定する
    </a>
  </p>
  <p style="font-size:13px;color:#555;">確認コード: <strong>{token}</strong></p>
  <p style="font-size:12px;color:#666;">リンクが機能しない場合は以下をブラウザに貼り付けてください：<br>{confirm_url}</p>
  <p style="font-size:12px;color:#888;">このリクエストに心当たりがない場合は無視してください。パスワードは変更されません。</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#999;"><a href="{site_url}" style="color:#999;">JobTV</a></p>
</body>
</html>',
    'パスワードリセットのリクエストを受け付けました。

下記リンクから新しいパスワードを設定してください（有効期限: 1時間）
{confirm_url}

確認コード: {token}

このリクエストに心当たりがない場合は無視してください。

JobTV {site_url}',
    ARRAY['confirm_url', 'token', 'site_url']
  )
ON CONFLICT (name) DO NOTHING;
