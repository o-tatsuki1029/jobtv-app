-- 学生確認メール・採用担当通知テンプレートを追加

INSERT INTO public.email_templates (name, description, subject, body_html, body_text, variables)
VALUES
  (
    'job_application_confirmation',
    '候補者が求人にエントリーした際に学生へ送る確認メール',
    '【JOBTV】求人へのエントリーを受け付けました',
    '<!DOCTYPE html>
<html lang="ja">
<body style="font-family: sans-serif; color: #222; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="border-bottom: 2px solid #e60000; padding-bottom: 8px;">求人エントリー受付完了</h2>
  <p>{last_name} {first_name} 様</p>
  <p>JOBTV をご利用いただきありがとうございます。<br>以下の求人へのエントリーを受け付けました。</p>
  <table style="border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">応募企業</td><td>{company_names}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; font-weight: bold; vertical-align: top;">応募求人</td><td style="white-space: pre-line;">{job_titles}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">エントリー日時</td><td>{applied_at}</td></tr>
  </table>
  <p>エントリー状況はマイページからご確認いただけます。</p>
  <p><a href="{site_url}/mypage" style="color:#e60000;">マイページを開く</a></p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#999;"><a href="{site_url}" style="color:#999;">JOBTV</a></p>
</body>
</html>',
    '{last_name} {first_name} 様

JOBTV をご利用いただきありがとうございます。
以下の求人へのエントリーを受け付けました。

応募企業: {company_names}
応募求人:
{job_titles}
エントリー日時: {applied_at}

エントリー状況はマイページからご確認いただけます。
マイページ: {site_url}/mypage

JOBTV {site_url}',
    ARRAY['last_name', 'first_name', 'job_titles', 'company_names', 'applied_at', 'site_url']
  ),
  (
    'session_reservation_confirmation',
    '候補者が説明会に参加予約した際に学生へ送る確認メール',
    '【JOBTV】説明会への参加予約を受け付けました',
    '<!DOCTYPE html>
<html lang="ja">
<body style="font-family: sans-serif; color: #222; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="border-bottom: 2px solid #e60000; padding-bottom: 8px;">説明会予約受付完了</h2>
  <p>{last_name} {first_name} 様</p>
  <p>JOBTV をご利用いただきありがとうございます。<br>以下の説明会への参加予約を受け付けました。</p>
  <table style="border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">企業名</td><td>{company_name}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">説明会</td><td>{session_title}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">日程</td><td>{event_date} {start_time}〜{end_time}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">予約日時</td><td>{reserved_at}</td></tr>
  </table>
  <p>予約状況はマイページからご確認いただけます。</p>
  <p><a href="{site_url}/mypage" style="color:#e60000;">マイページを開く</a></p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#999;"><a href="{site_url}" style="color:#999;">JOBTV</a></p>
</body>
</html>',
    '{last_name} {first_name} 様

JOBTV をご利用いただきありがとうございます。
以下の説明会への参加予約を受け付けました。

企業名: {company_name}
説明会: {session_title}
日程: {event_date} {start_time}〜{end_time}
予約日時: {reserved_at}

予約状況はマイページからご確認いただけます。
マイページ: {site_url}/mypage

JOBTV {site_url}',
    ARRAY['last_name', 'first_name', 'company_name', 'session_title', 'event_date', 'start_time', 'end_time', 'reserved_at', 'site_url']
  )
ON CONFLICT (name) DO NOTHING;
