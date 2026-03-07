-- candidate_welcome メールに LINE CTA ブロックを追加
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
  <div style="background:#f0fff4;border:1px solid #06C755;border-radius:8px;padding:16px 20px;margin:24px 0;">
    <p style="margin:0 0 8px;font-weight:bold;color:#222;">LINEと連携して就活情報をいち早くゲット！</p>
    <p style="margin:0 0 12px;font-size:14px;color:#555;">企業からの新着求人・説明会情報をLINEでお知らせします。</p>
    <a href="{site_url}/settings/line" style="background:#06C755;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">LINEと連携する</a>
  </div>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#999;"><a href="{site_url}" style="color:#999;">JobTV</a></p>
</body>
</html>',
  '{last_name} {first_name} 様

JobTV への会員登録ありがとうございます。
アカウントが正常に作成されました。

JobTV を見てみる: {site_url}

企業の動画を見たり、説明会に申し込んだりしてみましょう。

------------------------------------------------------------
■ LINEと連携して就活情報をいち早くゲット！
企業からの新着求人・説明会情報をLINEでお知らせします。
LINEと連携する: {site_url}/settings/line
------------------------------------------------------------

JobTV {site_url}',
  ARRAY['first_name', 'last_name', 'site_url']
)
ON CONFLICT (name) DO UPDATE SET
  body_html = EXCLUDED.body_html,
  body_text = EXCLUDED.body_text;
